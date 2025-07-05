import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { createDefaultFFmpegExecutor } from '../utils/factory.js';
import { validateFilePath, validateOutputPath } from '../utils/validation.js';
import { GifOptions } from '../types/index.js';

export class GifTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = createDefaultFFmpegExecutor();
  }

  async createGif(options: GifOptions): Promise<string> {
    validateFilePath(options.input);
    validateOutputPath(options.output);
    
    const args = ['-i', options.input];
    
    // Add start time if specified
    if (options.start_time) {
      args.push('-ss', options.start_time);
    }
    
    // Add duration if specified
    if (options.duration) {
      args.push('-t', options.duration);
    }
    
    // Build filter
    let filters = [];
    
    if (options.scale) {
      filters.push(`scale=${options.scale}`);
    }
    
    if (options.fps) {
      filters.push(`fps=${options.fps}`);
    }
    
    if (options.palette) {
      // Use palette for better quality
      filters.push('palettegen');
      const paletteArgs = [...args, '-vf', filters.join(','), '-y', '/tmp/palette.png'];
      await this.ffmpeg.execute(paletteArgs);
      
      // Now create GIF with palette
      const gifArgs = [
        '-i', options.input,
        '-i', '/tmp/palette.png'
      ];
      
      if (options.start_time) {
        gifArgs.push('-ss', options.start_time);
      }
      
      if (options.duration) {
        gifArgs.push('-t', options.duration);
      }
      
      gifArgs.push('-lavfi', 'paletteuse', '-y', options.output);
      await this.ffmpeg.execute(gifArgs);
    } else {
      // Simple GIF creation
      if (filters.length > 0) {
        args.push('-vf', filters.join(','));
      }
      
      args.push('-y', options.output);
      await this.ffmpeg.execute(args);
    }
    
    return `Successfully created GIF from ${options.input}`;
  }
}
