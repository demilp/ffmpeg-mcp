# FFmpeg MCP Server Development Guide

## Overview

This guide provides step-by-step instructions for creating a fully functional FFmpeg MCP (Model Context Protocol) server. The server will expose FFmpeg's multimedia processing capabilities through MCP's standardized interface.

## Prerequisites

- Node.js 18+ installed
- FFmpeg installed and accessible in PATH
- Basic understanding of TypeScript/JavaScript
- MCP SDK knowledge

## Project Structure

```
ffmpeg-mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── tools/
│   │   ├── convert.ts
│   │   ├── extract.ts
│   │   ├── info.ts
│   │   ├── resize.ts
│   │   ├── gif.ts
│   │   ├── merge.ts
│   │   └── watermark.ts
│   ├── utils/
│   │   ├── ffmpeg.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   └── types/
│       └── index.ts
├── build/
└── README.md
```

## Step 1: Initialize Project

```bash
mkdir ffmpeg-mcp-server
cd ffmpeg-mcp-server
npm init -y
```

## Step 2: Install Dependencies

```bash
npm install @modelcontextprotocol/sdk
npm install --save-dev typescript @types/node ts-node
```

## Step 3: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

## Step 4: Define Types

Create `src/types/index.ts`:

```typescript
export interface MediaInfo {
  duration: number;
  bitrate: number;
  format: string;
  codec: string;
  width?: number;
  height?: number;
  fps?: number;
  audio_codec?: string;
  audio_bitrate?: number;
  size: number;
}

export interface ConversionOptions {
  input: string;
  output: string;
  format?: string;
  quality?: 'high' | 'medium' | 'low';
  codec?: string;
  bitrate?: string;
  preset?: string;
}

export interface ResizeOptions {
  input: string;
  output: string;
  width: number;
  height: number;
  maintain_aspect?: boolean;
  scale_filter?: string;
}

export interface GifOptions {
  input: string;
  output: string;
  start_time?: string;
  duration?: string;
  fps?: number;
  scale?: string;
  palette?: boolean;
}

export interface WatermarkOptions {
  input: string;
  output: string;
  watermark_text?: string;
  watermark_image?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  font_size?: number;
  font_color?: string;
}

export interface FFmpegProgress {
  percent: number;
  currentTime: string;
  targetSize: number;
  speed: string;
}
```

## Step 5: Create Utility Functions

Create `src/utils/constants.ts`:

```typescript
export const SUPPORTED_VIDEO_FORMATS = [
  'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'm4v'
];

export const SUPPORTED_AUDIO_FORMATS = [
  'mp3', 'wav', 'aac', 'flac', 'ogg', 'wma', 'm4a'
];

export const QUALITY_PRESETS = {
  high: { crf: '18', preset: 'slow' },
  medium: { crf: '23', preset: 'medium' },
  low: { crf: '28', preset: 'fast' }
};

export const POSITION_FILTERS = {
  'top-left': '10:10',
  'top-right': 'W-w-10:10',
  'bottom-left': '10:H-h-10',
  'bottom-right': 'W-w-10:H-h-10',
  'center': '(W-w)/2:(H-h)/2'
};
```

Create `src/utils/validation.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_VIDEO_FORMATS, SUPPORTED_AUDIO_FORMATS } from './constants';

export function validateFilePath(filePath: string): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }
  
  // Prevent directory traversal
  if (filePath.includes('..') || filePath.includes('~')) {
    throw new Error('Invalid file path: directory traversal not allowed');
  }
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
}

export function validateOutputPath(outputPath: string): void {
  if (!outputPath || typeof outputPath !== 'string') {
    throw new Error('Invalid output path');
  }
  
  // Prevent directory traversal
  if (outputPath.includes('..') || outputPath.includes('~')) {
    throw new Error('Invalid output path: directory traversal not allowed');
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

export function validateVideoFormat(format: string): void {
  if (!SUPPORTED_VIDEO_FORMATS.includes(format.toLowerCase())) {
    throw new Error(`Unsupported video format: ${format}`);
  }
}

export function validateAudioFormat(format: string): void {
  if (!SUPPORTED_AUDIO_FORMATS.includes(format.toLowerCase())) {
    throw new Error(`Unsupported audio format: ${format}`);
  }
}

export function validateDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error('Width and height must be integers');
  }
  
  if (width <= 0 || height <= 0) {
    throw new Error('Width and height must be positive');
  }
  
  if (width > 7680 || height > 4320) {
    throw new Error('Maximum resolution is 7680x4320 (8K)');
  }
}
```

Create `src/utils/ffmpeg.ts`:

```typescript
import { spawn, ChildProcess } from 'child_process';
import { FFmpegProgress } from '../types';

export class FFmpegExecutor {
  private ffmpegPath: string;

  constructor() {
    this.ffmpegPath = this.detectFFmpegPath();
  }

  private detectFFmpegPath(): string {
    // Try common paths
    const commonPaths = [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      'ffmpeg' // Assume it's in PATH
    ];
    
    // For simplicity, return 'ffmpeg' assuming it's in PATH
    return 'ffmpeg';
  }

  public async execute(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`));
      });
    });
  }

  public async executeWithProgress(
    args: string[],
    onProgress?: (progress: FFmpegProgress) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        
        if (onProgress) {
          const progress = this.parseProgress(chunk);
          if (progress) {
            onProgress(progress);
          }
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`));
      });
    });
  }

  private parseProgress(output: string): FFmpegProgress | null {
    // Parse FFmpeg progress output
    const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
    const sizeMatch = output.match(/size=\s*(\d+)kB/);
    const speedMatch = output.match(/speed=\s*([\d.]+)x/);
    
    if (timeMatch) {
      return {
        percent: 0, // Would need duration to calculate
        currentTime: timeMatch[1],
        targetSize: sizeMatch ? parseInt(sizeMatch[1]) : 0,
        speed: speedMatch ? speedMatch[1] : '0'
      };
    }
    
    return null;
  }
}
```

## Step 6: Implement Tools

Create `src/tools/info.ts`:

```typescript
import { FFmpegExecutor } from '../utils/ffmpeg';
import { validateFilePath } from '../utils/validation';
import { MediaInfo } from '../types';

export class MediaInfoTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = new FFmpegExecutor();
  }

  async getMediaInfo(filePath: string): Promise<MediaInfo> {
    validateFilePath(filePath);
    
    const args = [
      '-i', filePath,
      '-f', 'null',
      '-'
    ];
    
    try {
      await this.ffmpeg.execute(args);
    } catch (error) {
      // FFmpeg outputs info to stderr even on "success"
      const output = error.message;
      return this.parseMediaInfo(output);
    }
    
    throw new Error('Failed to get media info');
  }

  private parseMediaInfo(output: string): MediaInfo {
    const durationMatch = output.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const bitrateMatch = output.match(/bitrate: (\d+) kb\/s/);
    const videoMatch = output.match(/Video: (\w+).*?(\d+)x(\d+).*?(\d+(?:\.\d+)?) fps/);
    const audioMatch = output.match(/Audio: (\w+).*?(\d+) kb\/s/);
    
    let duration = 0;
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      const minutes = parseInt(durationMatch[2]);
      const seconds = parseFloat(durationMatch[3]);
      duration = hours * 3600 + minutes * 60 + seconds;
    }
    
    return {
      duration,
      bitrate: bitrateMatch ? parseInt(bitrateMatch[1]) : 0,
      format: 'unknown',
      codec: videoMatch ? videoMatch[1] : 'unknown',
      width: videoMatch ? parseInt(videoMatch[2]) : undefined,
      height: videoMatch ? parseInt(videoMatch[3]) : undefined,
      fps: videoMatch ? parseFloat(videoMatch[4]) : undefined,
      audio_codec: audioMatch ? audioMatch[1] : undefined,
      audio_bitrate: audioMatch ? parseInt(audioMatch[2]) : undefined,
      size: 0 // Would need to get file size separately
    };
  }
}
```

Create `src/tools/convert.ts`:

```typescript
import { FFmpegExecutor } from '../utils/ffmpeg';
import { validateFilePath, validateOutputPath, validateVideoFormat } from '../utils/validation';
import { ConversionOptions } from '../types';
import { QUALITY_PRESETS } from '../utils/constants';

export class ConvertTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = new FFmpegExecutor();
  }

  async convertVideo(options: ConversionOptions): Promise<string> {
    validateFilePath(options.input);
    validateOutputPath(options.output);
    
    if (options.format) {
      validateVideoFormat(options.format);
    }
    
    const args = ['-i', options.input];
    
    // Add quality settings
    if (options.quality && QUALITY_PRESETS[options.quality]) {
      const preset = QUALITY_PRESETS[options.quality];
      args.push('-crf', preset.crf, '-preset', preset.preset);
    }
    
    // Add codec
    if (options.codec) {
      args.push('-c:v', options.codec);
    }
    
    // Add bitrate
    if (options.bitrate) {
      args.push('-b:v', options.bitrate);
    }
    
    // Add output
    args.push('-y', options.output);
    
    await this.ffmpeg.execute(args);
    return `Successfully converted ${options.input} to ${options.output}`;
  }
}
```

Create `src/tools/extract.ts`:

```typescript
import { FFmpegExecutor } from '../utils/ffmpeg';
import { validateFilePath, validateOutputPath, validateAudioFormat } from '../utils/validation';

export class ExtractTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = new FFmpegExecutor();
  }

  async extractAudio(input: string, output: string, format: string = 'mp3'): Promise<string> {
    validateFilePath(input);
    validateOutputPath(output);
    validateAudioFormat(format);
    
    const args = [
      '-i', input,
      '-vn', // No video
      '-acodec', this.getAudioCodec(format),
      '-y', // Overwrite output
      output
    ];
    
    await this.ffmpeg.execute(args);
    return `Successfully extracted audio from ${input} to ${output}`;
  }

  private getAudioCodec(format: string): string {
    const codecMap: { [key: string]: string } = {
      'mp3': 'libmp3lame',
      'aac': 'aac',
      'wav': 'pcm_s16le',
      'flac': 'flac',
      'ogg': 'libvorbis'
    };
    
    return codecMap[format.toLowerCase()] || 'copy';
  }
}
```

Create similar files for other tools (resize.ts, gif.ts, merge.ts, watermark.ts) following the same pattern.

## Step 7: Create Main Server

Create `src/server.ts`:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { MediaInfoTool } from './tools/info';
import { ConvertTool } from './tools/convert';
import { ExtractTool } from './tools/extract';
// Import other tools...

export class FFmpegMCPServer {
  private server: Server;
  private mediaInfoTool: MediaInfoTool;
  private convertTool: ConvertTool;
  private extractTool: ExtractTool;

  constructor() {
    this.server = new Server(
      {
        name: 'ffmpeg-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.mediaInfoTool = new MediaInfoTool();
    this.convertTool = new ConvertTool();
    this.extractTool = new ExtractTool();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_media_info',
            description: 'Get detailed information about media files',
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
            description: 'Convert video files between formats',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input file path' },
                output: { type: 'string', description: 'Output file path' },
                format: { type: 'string', description: 'Target format' },
                quality: { type: 'string', enum: ['high', 'medium', 'low'] }
              },
              required: ['input', 'output']
            }
          },
          {
            name: 'extract_audio',
            description: 'Extract audio from video files',
            inputSchema: {
              type: 'object',
              properties: {
                input: { type: 'string', description: 'Input video file' },
                output: { type: 'string', description: 'Output audio file' },
                format: { type: 'string', description: 'Audio format' }
              },
              required: ['input', 'output']
            }
          }
          // Add other tools...
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_media_info':
            const info = await this.mediaInfoTool.getMediaInfo(args.file);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(info, null, 2)
                }
              ]
            };

          case 'convert_video':
            const result = await this.convertTool.convertVideo(args);
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
              args.input,
              args.output,
              args.format
            );
            return {
              content: [
                {
                  type: 'text',
                  text: extractResult
                }
              ]
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
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
```

## Step 8: Create Entry Point

Create `src/index.ts`:

```typescript
#!/usr/bin/env node

import { FFmpegMCPServer } from './server';

async function main() {
  const server = new FFmpegMCPServer();
  await server.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

## Step 9: Build Configuration

Update `package.json`:

```json
{
  "name": "ffmpeg-mcp-server",
  "version": "1.0.0",
  "description": "FFmpeg MCP Server for multimedia processing",
  "main": "build/index.js",
  "bin": {
    "ffmpeg-mcp-server": "build/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "dev": "ts-node src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.0.0"
  }
}
```

## Step 10: Testing

Create test files and run:

```bash
npm run build
npm start
```

## Step 11: Configuration for MCP Client

Create configuration for Claude Desktop or other MCP clients:

```json
{
  "mcpServers": {
    "ffmpeg": {
      "command": "node",
      "args": ["/path/to/ffmpeg-mcp-server/build/index.js"]
    }
  }
}
```

## Additional Features to Implement

1. **Batch Processing**: Handle multiple files
2. **Progress Reporting**: Real-time progress updates
3. **Hardware Acceleration**: GPU encoding support
4. **Advanced Filters**: Custom FFmpeg filter chains
5. **Subtitle Support**: Extract/embed subtitles
6. **Stream Processing**: Handle streaming media
7. **Error Recovery**: Robust error handling
8. **Logging**: Comprehensive logging system
9. **Configuration**: External configuration file
10. **Security**: Input sanitization and rate limiting

## Security Considerations

- Validate all file paths to prevent directory traversal
- Limit file sizes and processing time
- Sanitize FFmpeg arguments
- Implement rate limiting
- Use secure temporary directories
- Validate file formats before processing

## Performance Optimizations

- Implement caching for media info
- Use streaming for large files
- Optimize FFmpeg parameters
- Monitor resource usage
- Implement queue system for batch processing

This guide provides a complete foundation for building a production-ready FFmpeg MCP server. Follow each step carefully and implement the additional features based on your specific requirements.