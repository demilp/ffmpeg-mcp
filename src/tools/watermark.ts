import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { createDefaultFFmpegExecutor } from '../utils/factory.js';
import { validateFilePath, validateOutputPath } from '../utils/validation.js';
import { WatermarkOptions } from '../types/index.js';
import { POSITION_FILTERS } from '../utils/constants.js';

export class WatermarkTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = createDefaultFFmpegExecutor();
  }

  async addTextWatermark(options: WatermarkOptions): Promise<string> {
    if (!options.watermark_text) {
      throw new Error('Watermark text is required');
    }
    
    validateFilePath(options.input);
    validateOutputPath(options.output);
    
    // Build a simpler, more reliable command structure
    const args = ['-i', options.input];
    
    // Build drawtext filter - keep it simple
    let drawTextFilter = `drawtext=text='${options.watermark_text}'`;
    
    if (options.font_size) {
      drawTextFilter += `:fontsize=${options.font_size}`;
    } else {
      drawTextFilter += `:fontsize=24`; // Default font size
    }
    
    if (options.font_color) {
      drawTextFilter += `:fontcolor=${options.font_color}`;
    } else {
      drawTextFilter += `:fontcolor=white`; // Default color
    }
    
    // Add positioning
    if (options.position && POSITION_FILTERS[options.position]) {
      const position = POSITION_FILTERS[options.position];
      const [x, y] = position.split(':');
      drawTextFilter += `:x=${x}:y=${y}`;
    } else {
      // Default to bottom-right
      drawTextFilter += `:x=w-tw-10:y=h-th-10`;
    }
    
    if (options.opacity) {
      const alpha = options.opacity / 100;
      drawTextFilter += `:alpha=${alpha}`;
    }
    
    // Add video filter and codec options
    args.push('-vf', drawTextFilter);
    args.push('-c:v', 'libx264');
    args.push('-c:a', 'copy');
    args.push('-y', options.output);
    
    console.error(`DEBUG Watermark Filter: ${drawTextFilter}`);
    console.error(`DEBUG Full Args: ${JSON.stringify(args)}`);
    
    await this.ffmpeg.execute(args);
    return `Successfully added text watermark to ${options.input}`;
  }

  async addImageWatermark(options: WatermarkOptions): Promise<string> {
    if (!options.watermark_image) {
      throw new Error('Watermark image is required');
    }
    
    validateFilePath(options.input);
    validateFilePath(options.watermark_image);
    validateOutputPath(options.output);
    
    const args = [
      '-i', options.input,
      '-i', options.watermark_image
    ];
    
    let overlayFilter = 'overlay=';
    
    if (options.position && POSITION_FILTERS[options.position]) {
      overlayFilter += POSITION_FILTERS[options.position];
    } else {
      overlayFilter += '10:10'; // Default position
    }
    
    args.push('-filter_complex', overlayFilter, '-y', options.output);
    
    await this.ffmpeg.execute(args);
    return `Successfully added image watermark to ${options.input}`;
  }
}
