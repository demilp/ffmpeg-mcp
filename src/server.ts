import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as path from 'path';

import { MediaInfoTool } from './tools/info.js';
import { ConvertTool } from './tools/convert.js';
import { ExtractTool } from './tools/extract.js';
import { ResizeTool } from './tools/resize.js';
import { GifTool } from './tools/gif.js';
import { MergeTool } from './tools/merge.js';
import { WatermarkTool } from './tools/watermark.js';
import { SubtitleTool } from './tools/subtitle.js';
import { AdvancedFilterTool } from './tools/advanced.js';
import { BatchTool } from './tools/batch.js';

import { FFmpegExecutor } from './utils/ffmpeg.js';
import { Logger } from './utils/logger.js';
import { SecurityManager } from './utils/security.js';
import { CacheManager } from './utils/cache.js';
import { JobQueue } from './utils/queue.js';
import { ServerConfig, defaultConfig } from './config/index.js';

export class FFmpegMCPServer {
  private server: Server;
  private config: ServerConfig;
  private logger!: Logger;
  private security!: SecurityManager;
  private cache!: CacheManager;
  private jobQueue!: JobQueue;
  private ffmpeg!: FFmpegExecutor;
  
  // Tools
  private mediaInfoTool!: MediaInfoTool;
  private convertTool!: ConvertTool;
  private extractTool!: ExtractTool;
  private resizeTool!: ResizeTool;
  private gifTool!: GifTool;
  private mergeTool!: MergeTool;
  private watermarkTool!: WatermarkTool;
  private subtitleTool!: SubtitleTool;
  private advancedFilterTool!: AdvancedFilterTool;
  private batchTool!: BatchTool;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.server = new Server({
      name: 'ffmpeg-mcp-server',
      version: '2.0.0',
    });

    this.setupInfrastructure();
    this.setupTools();
    this.setupHandlers();
  }

  private setupInfrastructure(): void {
    this.logger = new Logger(this.config.logging);
    this.security = new SecurityManager(this.config.security, this.logger);
    this.cache = new CacheManager(this.config.performance, this.logger);
    this.jobQueue = new JobQueue(this.config.performance, this.logger);
    this.ffmpeg = new FFmpegExecutor(this.config.ffmpeg, this.logger, this.security);
    
    this.logger.info('FFmpeg MCP Server infrastructure initialized');
  }

  private setupTools(): void {
    this.mediaInfoTool = new MediaInfoTool(this.ffmpeg, this.cache, this.logger);
    this.convertTool = new ConvertTool();
    this.extractTool = new ExtractTool();
    this.resizeTool = new ResizeTool();
    this.gifTool = new GifTool();
    this.mergeTool = new MergeTool();
    this.watermarkTool = new WatermarkTool();
    this.subtitleTool = new SubtitleTool(this.ffmpeg);
    this.advancedFilterTool = new AdvancedFilterTool(this.ffmpeg);
    this.batchTool = new BatchTool(this.ffmpeg, this.logger, this.jobQueue);
    
    this.logger.info('FFmpeg MCP Server tools initialized');
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_media_info',
            description: 'Get detailed information about media files including duration, format, codec, resolution, and bitrate',
            inputSchema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  description: 'Path to media file'
                }
              },
              required: ['file']
            }
          },
          {
            name: 'convert_video',
            description: 'Convert video files between different formats with quality and codec options',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input file path' },
                output: { type: 'string', description: 'Output file path' },
                format: { type: 'string', description: 'Target format (mp4, avi, mov, etc.)' },
                quality: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Quality preset' },
                codec: { type: 'string', description: 'Video codec (h264, hevc, etc.)' },
                bitrate: { type: 'string', description: 'Video bitrate (e.g., 1000k)' }
              },
              required: ['input', 'output']
            }
          },
          {
            name: 'extract_audio',
            description: 'Extract audio from video files in various formats',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output audio file path' },
                format: { type: 'string', description: 'Audio format (mp3, aac, wav, flac, ogg)' }
              },
              required: ['input', 'output']
            }
          },
          {
            name: 'resize_video',
            description: 'Resize video to specified dimensions with aspect ratio options',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                width: { type: 'number', description: 'Target width in pixels' },
                height: { type: 'number', description: 'Target height in pixels' },
                maintain_aspect: { type: 'boolean', description: 'Maintain aspect ratio' },
                scale_filter: { type: 'string', description: 'Custom scale filter' }
              },
              required: ['input', 'output', 'width', 'height']
            }
          },
          {
            name: 'create_gif',
            description: 'Create animated GIF from video with customizable options',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output GIF file path' },
                start_time: { type: 'string', description: 'Start time (HH:MM:SS or seconds)' },
                duration: { type: 'string', description: 'Duration (HH:MM:SS or seconds)' },
                fps: { type: 'number', description: 'Frames per second' },
                scale: { type: 'string', description: 'Scale (e.g., 320:240, 50%)' },
                palette: { type: 'boolean', description: 'Use palette for better quality' }
              },
              required: ['input', 'output']
            }
          },
          {
            name: 'merge_videos',
            description: 'Merge multiple video files into one with re-encoding',
            inputSchema: {
              type: 'object',
              properties: {
                inputs: { type: 'array', items: { type: 'string' }, description: 'Array of input video file paths' },
                output: { type: 'string', description: 'Output video file path' }
              },
              required: ['inputs', 'output']
            }
          },
          {
            name: 'concatenate_videos',
            description: 'Concatenate multiple video files without re-encoding (faster)',
            inputSchema: {
              type: 'object',
              properties: {
                inputs: { type: 'array', items: { type: 'string' }, description: 'Array of input video file paths' },
                output: { type: 'string', description: 'Output video file path' }
              },
              required: ['inputs', 'output']
            }
          },
          {
            name: 'add_text_watermark',
            description: 'Add text watermark to video',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                watermark_text: { type: 'string', description: 'Text to display as watermark' },
                position: { type: 'string', enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'], description: 'Watermark position' },
                font_size: { type: 'number', description: 'Font size in pixels' },
                font_color: { type: 'string', description: 'Font color (e.g., white, #FFFFFF)' },
                opacity: { type: 'number', description: 'Opacity percentage (0-100)' }
              },
              required: ['input', 'output', 'watermark_text']
            }
          },
          {
            name: 'add_image_watermark',
            description: 'Add image watermark to video',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                watermark_image: { type: 'string', description: 'Watermark image file path' },
                position: { type: 'string', enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'], description: 'Watermark position' }
              },
              required: ['input', 'output', 'watermark_image']
            }
          },
          // Subtitle tools
          {
            name: 'extract_subtitles',
            description: 'Extract subtitles from video files',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output subtitle file path' },
                stream_index: { type: 'number', description: 'Subtitle stream index (default: 0)' },
                format: { type: 'string', enum: ['srt', 'vtt', 'ass', 'sup'], description: 'Subtitle format' }
              },
              required: ['input', 'output']
            }
          },
          {
            name: 'embed_subtitles',
            description: 'Embed subtitle file into video',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                subtitles: { type: 'string', description: 'Subtitle file path' },
                output: { type: 'string', description: 'Output video file path' },
                language: { type: 'string', description: 'Language code (e.g., en, es, fr)' }
              },
              required: ['input', 'subtitles', 'output']
            }
          },
          {
            name: 'burn_subtitles',
            description: 'Burn subtitles directly into video frames',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                subtitles: { type: 'string', description: 'Subtitle file path' },
                output: { type: 'string', description: 'Output video file path' },
                font_size: { type: 'number', description: 'Font size' },
                font_color: { type: 'string', description: 'Font color' },
                position: { type: 'string', enum: ['bottom', 'top', 'center'], description: 'Subtitle position' }
              },
              required: ['input', 'subtitles', 'output']
            }
          },
          // Advanced filter tools
          {
            name: 'apply_custom_filter',
            description: 'Apply custom FFmpeg filter chain to video',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                filter: { type: 'string', description: 'FFmpeg filter expression' }
              },
              required: ['input', 'output', 'filter']
            }
          },
          {
            name: 'denoise_video',
            description: 'Remove noise from video using advanced filters',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                strength: { type: 'string', enum: ['light', 'medium', 'strong'], description: 'Denoising strength' }
              },
              required: ['input', 'output']
            }
          },
          {
            name: 'color_correction',
            description: 'Apply color correction to video',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                brightness: { type: 'number', description: 'Brightness adjustment (-1 to 1)' },
                contrast: { type: 'number', description: 'Contrast adjustment (0 to 2)' },
                saturation: { type: 'number', description: 'Saturation adjustment (0 to 3)' },
                hue: { type: 'number', description: 'Hue adjustment in degrees (-180 to 180)' }
              },
              required: ['input', 'output']
            }
          },
          {
            name: 'stabilize_video',
            description: 'Stabilize shaky video footage',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                strength: { type: 'string', enum: ['light', 'medium', 'strong'], description: 'Stabilization strength' }
              },
              required: ['input', 'output']
            }
          },
          {
            name: 'create_slow_motion',
            description: 'Create slow motion effect',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                factor: { type: 'number', description: 'Slow motion factor (0.1 to 1.0)' }
              },
              required: ['input', 'output', 'factor']
            }
          },
          {
            name: 'create_timelapse',
            description: 'Create time-lapse effect',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                factor: { type: 'number', description: 'Time-lapse factor (1.0 to 100.0)' }
              },
              required: ['input', 'output', 'factor']
            }
          },
          {
            name: 'crop_video',
            description: 'Crop video to specific dimensions',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file path' },
                output: { type: 'string', description: 'Output video file path' },
                x: { type: 'number', description: 'X coordinate of crop area' },
                y: { type: 'number', description: 'Y coordinate of crop area' },
                width: { type: 'number', description: 'Width of crop area' },
                height: { type: 'number', description: 'Height of crop area' }
              },
              required: ['input', 'output', 'x', 'y', 'width', 'height']
            }
          },
          // Batch processing tools
          {
            name: 'batch_process',
            description: 'Process multiple files with the same operation',
            inputSchema: {
              type: 'object',
              properties: {
                files: { type: 'array', items: { type: 'string' }, description: 'Array of input file paths' },
                operation: { type: 'string', enum: ['convert', 'resize', 'extract_audio', 'create_gif'], description: 'Operation to perform' },
                output_dir: { type: 'string', description: 'Output directory' },
                options: { type: 'object', description: 'Operation-specific options' }
              },
              required: ['files', 'operation', 'output_dir']
            }
          },
          {
            name: 'get_batch_status',
            description: 'Get status of batch processing job',
            inputSchema: {
              type: 'object',
              properties: {
                job_id: { type: 'string', description: 'Job ID returned from batch_process' }
              },
              required: ['job_id']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error('Missing arguments');
      }

      try {
        // Apply security checks for file paths
        if (args.input) {
          this.security.validateFilePath(args.input as string);
        }
        if (args.output) {
          this.security.validateFileSize(args.input as string);
        }

        switch (name) {
          case 'get_media_info':
            const info = await this.mediaInfoTool.getMediaInfo(args.file as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(info, null, 2)
                }
              ]
            };

          case 'convert_video':
            const result = await this.convertTool.convertVideo(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: result
                }
              ]
            };

          case 'extract_audio':
            const extractResult = await this.extractTool.extractAudio(
              args.input as string,
              args.output as string,
              args.format as string
            );
            return {
              content: [
                {
                  type: 'text',
                  text: extractResult
                }
              ]
            };

          case 'resize_video':
            const resizeResult = await this.resizeTool.resizeVideo(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: resizeResult
                }
              ]
            };

          case 'create_gif':
            const gifResult = await this.gifTool.createGif(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: gifResult
                }
              ]
            };

          case 'merge_videos':
            const mergeResult = await this.mergeTool.mergeVideos(args.inputs as string[], args.output as string);
            return {
              content: [
                {
                  type: 'text',
                  text: mergeResult
                }
              ]
            };

          case 'concatenate_videos':
            const concatResult = await this.mergeTool.concatenateVideos(args.inputs as string[], args.output as string);
            return {
              content: [
                {
                  type: 'text',
                  text: concatResult
                }
              ]
            };

          case 'add_text_watermark':
            const textWatermarkResult = await this.watermarkTool.addTextWatermark(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: textWatermarkResult
                }
              ]
            };

          case 'add_image_watermark':
            const imageWatermarkResult = await this.watermarkTool.addImageWatermark(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: imageWatermarkResult
                }
              ]
            };

          // Subtitle tools
          case 'extract_subtitles':
            const extractSubsResult = await this.subtitleTool.extractSubtitles(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: extractSubsResult
                }
              ]
            };

          case 'embed_subtitles':
            const embedSubsResult = await this.subtitleTool.embedSubtitles(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: embedSubsResult
                }
              ]
            };

          case 'burn_subtitles':
            const burnSubsResult = await this.subtitleTool.burnSubtitles(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: burnSubsResult
                }
              ]
            };

          // Advanced filter tools
          case 'apply_custom_filter':
            const filterResult = await this.advancedFilterTool.applyCustomFilter(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: filterResult
                }
              ]
            };

          case 'denoise_video':
            const denoiseResult = await this.advancedFilterTool.denoiseVideo(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: denoiseResult
                }
              ]
            };

          case 'color_correction':
            const colorResult = await this.advancedFilterTool.correctColors(args as any);
            return {
              content: [
                {
                  type: 'text',
                  text: colorResult
                }
              ]
            };

          case 'stabilize_video':
            const stabilizeResult = await this.advancedFilterTool.stabilizeVideo(args.input as string, args.output as string);
            return {
              content: [
                {
                  type: 'text',
                  text: stabilizeResult
                }
              ]
            };

          case 'create_slow_motion':
            const slowMotionResult = await this.advancedFilterTool.createSlowMotion(
              args.input as string, 
              args.output as string, 
              args.factor as number
            );
            return {
              content: [
                {
                  type: 'text',
                  text: slowMotionResult
                }
              ]
            };

          case 'create_timelapse':
            const timelapseResult = await this.advancedFilterTool.createTimelapseEffect(
              args.input as string, 
              args.output as string, 
              args.factor as number
            );
            return {
              content: [
                {
                  type: 'text',
                  text: timelapseResult
                }
              ]
            };

          case 'crop_video':
            const cropResult = await this.advancedFilterTool.cropVideo(
              args.input as string,
              args.output as string,
              args.x as number,
              args.y as number,
              args.width as number,
              args.height as number
            );
            return {
              content: [
                {
                  type: 'text',
                  text: cropResult
                }
              ]
            };

          // Batch processing tools
          case 'batch_process':
            const batchJobs = (args.files as string[]).map(file => ({
              input: file,
              output: path.join(args.output_dir as string, path.basename(file)),
              operation: {
                type: args.operation as any,
                options: args.options || {}
              }
            }));
            const batchResult = await this.batchTool.processBatch(batchJobs);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(batchResult, null, 2)
                }
              ]
            };

          case 'get_batch_status':
            const statusResult = await this.batchTool.getJobStatus(args.job_id as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(statusResult, null, 2)
                }
              ]
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        this.logger.error(`Tool execution failed: ${error.message}`, { tool: name, error: error.stack });
        throw new Error(`Tool execution failed: ${error.message}`);
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('FFmpeg MCP server running on stdio');
  }
}
