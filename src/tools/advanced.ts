import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { validateFilePath, validateOutputPath } from '../utils/validation.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface FilterOptions {
  input: string;
  output: string;
  filters: string[];
  complex?: boolean;
}

export interface NoiseReductionOptions {
  input: string;
  output: string;
  strength?: 'light' | 'medium' | 'strong';
}

export interface ColorCorrectionOptions {
  input: string;
  output: string;
  brightness?: number; // -1.0 to 1.0
  contrast?: number;   // 0.0 to 4.0
  saturation?: number; // 0.0 to 3.0
  gamma?: number;      // 0.1 to 10.0
}

export class AdvancedFilterTool {
  private ffmpeg: FFmpegExecutor;

  constructor(ffmpeg: FFmpegExecutor) {
    this.ffmpeg = ffmpeg;
  }

  async applyCustomFilter(options: FilterOptions): Promise<string> {
    validateFilePath(options.input);
    validateOutputPath(options.output);

    if (!options.filters || options.filters.length === 0) {
      throw new Error('At least one filter must be specified');
    }

    const args = ['-i', options.input];

    if (options.complex) {
      // Use complex filter graph
      const filterGraph = options.filters.join(',');
      args.push('-filter_complex', filterGraph);
    } else {
      // Use simple video filter
      const filterChain = options.filters.join(',');
      args.push('-vf', filterChain);
    }

    args.push('-y', options.output);

    await this.ffmpeg.execute(args);
    return `Successfully applied custom filters to ${options.input}`;
  }

  async denoiseVideo(options: NoiseReductionOptions): Promise<string> {
    validateFilePath(options.input);
    validateOutputPath(options.output);

    const strength = options.strength || 'medium';
    const denoiseLevels = {
      light: 'hqdn3d=4:3:6:4',
      medium: 'hqdn3d=8:6:12:9',
      strong: 'hqdn3d=25:20:35:30,nlmeans=s=5.0:p=7:r=21,unsharp=5:5:-2:5:5:-2'
    };

    const args = [
      '-i', options.input,
      '-vf', denoiseLevels[strength],
      '-c:a', 'copy',
      '-y', options.output
    ];

    await this.ffmpeg.execute(args);
    return `Successfully denoised ${options.input} with ${strength} strength`;
  }

  async correctColors(options: ColorCorrectionOptions): Promise<string> {
    validateFilePath(options.input);
    validateOutputPath(options.output);

    const filters: string[] = [];

    // Build eq filter for color correction
    const eqParams: string[] = [];
    
    if (options.brightness !== undefined) {
      eqParams.push(`brightness=${options.brightness}`);
    }
    if (options.contrast !== undefined) {
      eqParams.push(`contrast=${options.contrast}`);
    }
    if (options.saturation !== undefined) {
      eqParams.push(`saturation=${options.saturation}`);
    }
    if (options.gamma !== undefined) {
      eqParams.push(`gamma=${options.gamma}`);
    }

    if (eqParams.length > 0) {
      filters.push(`eq=${eqParams.join(':')}`);
    }

    if (filters.length === 0) {
      throw new Error('At least one color correction parameter must be specified');
    }

    const args = [
      '-i', options.input,
      '-vf', filters.join(','),
      '-c:a', 'copy',
      '-y', options.output
    ];

    await this.ffmpeg.execute(args);
    return `Successfully applied color correction to ${options.input}`;
  }

  async stabilizeVideo(input: string, output: string): Promise<string> {
    validateFilePath(input);
    validateOutputPath(output);

    // Two-pass stabilization
    const passLogFile = path.join(os.tmpdir(), `stabilize-${Date.now()}.trf`);

    // First pass: detect motion
    const pass1Args = [
      '-i', input,
      '-vf', `vidstabdetect=stepsize=6:shakiness=8:accuracy=9:result=${passLogFile}`,
      '-f', 'null',
      '-'
    ];

    await this.ffmpeg.execute(pass1Args);

    // Second pass: apply stabilization
    const pass2Args = [
      '-i', input,
      '-vf', `vidstabtransform=input=${passLogFile}:zoom=5:smoothing=15`,
      '-c:a', 'copy',
      '-y', output
    ];

    await this.ffmpeg.execute(pass2Args);

    // Clean up
    try {
      fs.unlinkSync(passLogFile);
    } catch (error) {
      // Ignore cleanup errors
    }

    return `Successfully stabilized video: ${input}`;
  }

  async createSlowMotion(input: string, output: string, speed: number = 0.5): Promise<string> {
    validateFilePath(input);
    validateOutputPath(output);

    if (speed <= 0 || speed >= 1) {
      throw new Error('Speed must be between 0 and 1 for slow motion');
    }

    const args = [
      '-i', input,
      '-filter_complex', `[0:v]setpts=${1/speed}*PTS[v];[0:a]atempo=${speed}[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-y', output
    ];

    await this.ffmpeg.execute(args);
    return `Successfully created slow motion video at ${speed}x speed`;
  }

  async createTimelapseEffect(input: string, output: string, speed: number = 4): Promise<string> {
    validateFilePath(input);
    validateOutputPath(output);

    if (speed <= 1) {
      throw new Error('Speed must be greater than 1 for timelapse');
    }

    const args = [
      '-i', input,
      '-filter_complex', `[0:v]setpts=${1/speed}*PTS[v];[0:a]atempo=${Math.min(speed, 2)}[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-y', output
    ];

    await this.ffmpeg.execute(args);
    return `Successfully created timelapse video at ${speed}x speed`;
  }

  async cropVideo(input: string, output: string, x: number, y: number, width: number, height: number): Promise<string> {
    validateFilePath(input);
    validateOutputPath(output);

    const args = [
      '-i', input,
      '-vf', `crop=${width}:${height}:${x}:${y}`,
      '-c:a', 'copy',
      '-y', output
    ];

    await this.ffmpeg.execute(args);
    return `Successfully cropped video to ${width}x${height} at position (${x}, ${y})`;
  }
}
