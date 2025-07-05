import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { validateFilePath, validateOutputPath } from '../utils/validation.js';

export interface SubtitleOptions {
  input: string;
  output: string;
  subtitleFile?: string;
  subtitleIndex?: number;
  format?: 'srt' | 'vtt' | 'ass' | 'ssa';
  language?: string;
  encoding?: string;
}

export class SubtitleTool {
  private ffmpeg: FFmpegExecutor;

  constructor(ffmpeg: FFmpegExecutor) {
    this.ffmpeg = ffmpeg;
  }

  async extractSubtitles(options: SubtitleOptions): Promise<string> {
    validateFilePath(options.input);
    validateOutputPath(options.output);

    const args = ['-i', options.input];

    // Specify subtitle stream
    if (options.subtitleIndex !== undefined) {
      args.push('-map', `0:s:${options.subtitleIndex}`);
    } else {
      args.push('-map', '0:s:0'); // First subtitle stream
    }

    // Set output format
    if (options.format) {
      args.push('-c:s', this.getSubtitleCodec(options.format));
    }

    // Set encoding
    if (options.encoding) {
      args.push('-sub_charenc', options.encoding);
    }

    args.push('-y', options.output);

    await this.ffmpeg.execute(args);
    return `Successfully extracted subtitles from ${options.input} to ${options.output}`;
  }

  async embedSubtitles(options: SubtitleOptions): Promise<string> {
    if (!options.subtitleFile) {
      throw new Error('Subtitle file is required for embedding');
    }

    validateFilePath(options.input);
    validateFilePath(options.subtitleFile);
    validateOutputPath(options.output);

    const args = [
      '-i', options.input,
      '-i', options.subtitleFile
    ];

    // Copy video and audio streams
    args.push('-c:v', 'copy', '-c:a', 'copy');

    // Add subtitle stream
    args.push('-c:s', this.getSubtitleCodec(options.format || 'srt'));

    // Set language metadata
    if (options.language) {
      args.push('-metadata:s:s:0', `language=${options.language}`);
    }

    args.push('-y', options.output);

    await this.ffmpeg.execute(args);
    return `Successfully embedded subtitles into ${options.input}`;
  }

  async burnSubtitles(options: SubtitleOptions): Promise<string> {
    if (!options.subtitleFile) {
      throw new Error('Subtitle file is required for burning');
    }

    validateFilePath(options.input);
    validateFilePath(options.subtitleFile);
    validateOutputPath(options.output);

    const args = ['-i', options.input];

    // Use subtitles filter to burn in subtitles
    const subtitleFilter = `subtitles=${options.subtitleFile.replace(/:/g, '\\:')}`;
    args.push('-vf', subtitleFilter);

    // Copy audio
    args.push('-c:a', 'copy');

    args.push('-y', options.output);

    await this.ffmpeg.execute(args);
    return `Successfully burned subtitles into ${options.input}`;
  }

  private getSubtitleCodec(format: string): string {
    const codecMap: { [key: string]: string } = {
      'srt': 'srt',
      'vtt': 'webvtt',
      'ass': 'ass',
      'ssa': 'ssa'
    };

    return codecMap[format.toLowerCase()] || 'srt';
  }
}
