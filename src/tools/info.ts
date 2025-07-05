import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { validateFilePath } from '../utils/validation.js';
import { MediaInfo } from '../types/index.js';
import { CacheManager } from '../utils/cache.js';
import { Logger } from '../utils/logger.js';
import * as fs from 'fs';

export class MediaInfoTool {
  private ffmpeg: FFmpegExecutor;
  private cache?: CacheManager;
  private logger?: Logger;

  constructor(ffmpeg?: FFmpegExecutor, cache?: CacheManager, logger?: Logger) {
    // Use provided FFmpegExecutor or create a simple one
    this.ffmpeg = ffmpeg || new FFmpegExecutor(
      { path: 'ffmpeg', enableGPU: false, timeout: 300000, defaultPreset: 'medium', hwAccelOptions: { nvidia: [], intel: [], amd: [] } },
      logger || new Logger({ level: 'info', enableFileLogging: false, logDirectory: '/tmp/logs', maxLogSize: 10485760 }),
      // We'll create a minimal security manager for the default case
      new (class {
        validateFilePath() {}
        validateFileSize() {}
        sanitizeArguments(args: string[]) { return args; }
      })() as any
    );
    this.cache = cache;
    this.logger = logger;
  }

  async getMediaInfo(filePath: string): Promise<MediaInfo> {
    validateFilePath(filePath);
    
    // Check cache first
    if (this.cache) {
      const cached = this.cache.getMediaInfo(filePath);
      if (cached) {
        this.logger?.info(`Cache hit for media info: ${filePath}`);
        return cached;
      }
    }

    const args = [
      '-i', filePath,
      '-f', 'null',
      '-'
    ];
    
    try {
      await this.ffmpeg.execute(args);
    } catch (error: any) {
      // FFmpeg outputs info to stderr even on "success"
      const output = error.message;
      const info = this.parseMediaInfo(output, filePath);
      
      // Cache the result
      if (this.cache) {
        this.cache.setMediaInfo(filePath, info);
      }
      
      this.logger?.info(`Retrieved media info for: ${filePath}`);
      return info;
    }
    
    throw new Error('Failed to get media info');
  }

  private parseMediaInfo(output: string, filePath: string): MediaInfo {
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
