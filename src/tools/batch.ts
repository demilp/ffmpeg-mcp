import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { validateFilePath, validateOutputPath } from '../utils/validation.js';
import { Logger } from '../utils/logger.js';
import { JobQueue } from '../utils/queue.js';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface BatchOperation {
  type: 'convert' | 'resize' | 'extract_audio' | 'watermark';
  options: any;
}

export interface BatchJob {
  input: string;
  output: string;
  operation: BatchOperation;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile?: string;
  errors: string[];
}

export class BatchTool {
  private ffmpeg: FFmpegExecutor;
  private logger: Logger;
  private jobQueue: JobQueue;

  constructor(ffmpeg: FFmpegExecutor, logger: Logger, jobQueue: JobQueue) {
    this.ffmpeg = ffmpeg;
    this.logger = logger;
    this.jobQueue = jobQueue;
  }

  async processBatch(
    jobs: BatchJob[], 
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchProgress> {
    const progress: BatchProgress = {
      total: jobs.length,
      completed: 0,
      failed: 0,
      errors: []
    };

    this.logger.info(`Starting batch processing of ${jobs.length} files`);

    const promises = jobs.map(async (job, index) => {
      try {
        progress.currentFile = job.input;
        onProgress?.(progress);

        await this.processJob(job);
        
        progress.completed++;
        this.logger.debug(`Completed job ${index + 1}/${jobs.length}: ${job.input}`);
        
      } catch (error) {
        progress.failed++;
        const errorMsg = `Failed to process ${job.input}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        progress.errors.push(errorMsg);
        this.logger.error(errorMsg);
      }

      onProgress?.(progress);
    });

    await Promise.allSettled(promises);

    this.logger.info(`Batch processing completed: ${progress.completed} successful, ${progress.failed} failed`);
    return progress;
  }

  private async processJob(job: BatchJob): Promise<void> {
    validateFilePath(job.input);
    validateOutputPath(job.output);

    switch (job.operation.type) {
      case 'convert':
        await this.convertFile(job);
        break;
      case 'resize':
        await this.resizeFile(job);
        break;
      case 'extract_audio':
        await this.extractAudioFile(job);
        break;
      case 'watermark':
        await this.watermarkFile(job);
        break;
      default:
        throw new Error(`Unknown operation type: ${job.operation.type}`);
    }
  }

  private async convertFile(job: BatchJob): Promise<void> {
    const { input, output } = job;
    const options = job.operation.options;

    const args = ['-i', input];

    if (options.quality) {
      const qualityMap = {
        high: ['-crf', '18'],
        medium: ['-crf', '23'],
        low: ['-crf', '28']
      };
      args.push(...(qualityMap[options.quality as keyof typeof qualityMap] || qualityMap.medium));
    }

    if (options.codec) {
      args.push('-c:v', options.codec);
    }

    if (options.bitrate) {
      args.push('-b:v', options.bitrate);
    }

    args.push('-y', output);
    await this.ffmpeg.execute(args);
  }

  private async resizeFile(job: BatchJob): Promise<void> {
    const { input, output } = job;
    const { width, height, maintainAspect } = job.operation.options;

    const args = ['-i', input];
    
    let scaleFilter = `scale=${width}:${height}`;
    if (maintainAspect) {
      scaleFilter += ':force_original_aspect_ratio=decrease';
    }

    args.push('-vf', scaleFilter, '-y', output);
    await this.ffmpeg.execute(args);
  }

  private async extractAudioFile(job: BatchJob): Promise<void> {
    const { input, output } = job;
    const { format = 'mp3' } = job.operation.options;

    const codecMap: { [key: string]: string } = {
      'mp3': 'libmp3lame',
      'aac': 'aac',
      'wav': 'pcm_s16le',
      'flac': 'flac'
    };

    const args = [
      '-i', input,
      '-vn',
      '-acodec', codecMap[format] || 'libmp3lame',
      '-y', output
    ];

    await this.ffmpeg.execute(args);
  }

  private async watermarkFile(job: BatchJob): Promise<void> {
    const { input, output } = job;
    const { text, position = 'bottom-right', fontSize = 24, color = 'white' } = job.operation.options;

    const positionMap = {
      'top-left': '10:10',
      'top-right': 'W-w-10:10',
      'bottom-left': '10:H-h-10',
      'bottom-right': 'W-w-10:H-h-10',
      'center': '(W-w)/2:(H-h)/2'
    };

    const drawTextFilter = `drawtext=text='${text}':x=${positionMap[position as keyof typeof positionMap]}:fontsize=${fontSize}:fontcolor=${color}`;
    
    const args = [
      '-i', input,
      '-vf', drawTextFilter,
      '-y', output
    ];

    await this.ffmpeg.execute(args);
  }

  async createBatchFromDirectory(
    inputDir: string,
    outputDir: string,
    operation: BatchOperation,
    filePattern: string = '*'
  ): Promise<BatchJob[]> {
    if (!fs.existsSync(inputDir)) {
      throw new Error(`Input directory does not exist: ${inputDir}`);
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pattern = path.join(inputDir, filePattern);
    const files = await glob(pattern);

    if (files.length === 0) {
      throw new Error(`No files found matching pattern: ${pattern}`);
    }

    const jobs: BatchJob[] = files.map((inputFile: string) => {
      const basename = path.basename(inputFile, path.extname(inputFile));
      const extension = this.getOutputExtension(operation.type);
      const outputFile = path.join(outputDir, `${basename}${extension}`);

      return {
        input: inputFile,
        output: outputFile,
        operation
      };
    });

    this.logger.info(`Created batch of ${jobs.length} jobs from directory: ${inputDir}`);
    return jobs;
  }

  private getOutputExtension(operationType: string): string {
    switch (operationType) {
      case 'convert':
        return '.mp4';
      case 'resize':
        return '.mp4';
      case 'extract_audio':
        return '.mp3';
      case 'watermark':
        return '.mp4';
      default:
        return '.mp4';
    }
  }

  async getJobStatus(jobId: string): Promise<{ status: string; progress?: any }> {
    // For now, we'll return a simple status since we don't have persistent job tracking
    // In a production environment, this would query a database or cache
    return {
      status: 'completed',
      progress: {
        message: 'Job status tracking not implemented in this version'
      }
    };
  }
}
