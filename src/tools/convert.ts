import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { createDefaultFFmpegExecutor } from '../utils/factory.js';
import { validateFilePath, validateOutputPath, validateVideoFormat } from '../utils/validation.js';
import { ConversionOptions } from '../types/index.js';
import { QUALITY_PRESETS } from '../utils/constants.js';

export class ConvertTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = createDefaultFFmpegExecutor();
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
