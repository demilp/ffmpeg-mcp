import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { createDefaultFFmpegExecutor } from '../utils/factory.js';
import { validateFilePath, validateOutputPath, validateAudioFormat } from '../utils/validation.js';

export class ExtractTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = createDefaultFFmpegExecutor();
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
