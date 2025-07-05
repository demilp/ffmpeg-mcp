import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { createDefaultFFmpegExecutor } from '../utils/factory.js';
import { validateFilePath, validateOutputPath, validateDimensions } from '../utils/validation.js';
import { ResizeOptions } from '../types/index.js';

export class ResizeTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = createDefaultFFmpegExecutor();
  }

  async resizeVideo(options: ResizeOptions): Promise<string> {
    validateFilePath(options.input);
    validateOutputPath(options.output);
    validateDimensions(options.width, options.height);
    
    const args = ['-i', options.input];
    
    let scaleFilter = `scale=${options.width}:${options.height}`;
    
    if (options.maintain_aspect) {
      scaleFilter = `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease`;
    }
    
    if (options.scale_filter) {
      scaleFilter = options.scale_filter;
    }
    
    args.push('-vf', scaleFilter, '-y', options.output);
    
    await this.ffmpeg.execute(args);
    return `Successfully resized ${options.input} to ${options.width}x${options.height}`;
  }
}
