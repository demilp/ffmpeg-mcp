import { FFmpegExecutor } from '../utils/ffmpeg.js';
import { createDefaultFFmpegExecutor } from '../utils/factory.js';
import { validateFilePath, validateOutputPath } from '../utils/validation.js';
import * as fs from 'fs';
import * as path from 'path';

export class MergeTool {
  private ffmpeg: FFmpegExecutor;

  constructor() {
    this.ffmpeg = createDefaultFFmpegExecutor();
  }

  async mergeVideos(inputs: string[], output: string): Promise<string> {
    if (inputs.length < 2) {
      throw new Error('At least 2 input files are required for merging');
    }
    
    inputs.forEach(input => validateFilePath(input));
    validateOutputPath(output);
    
    const args: string[] = [];
    
    // Add all input files
    inputs.forEach(input => {
      args.push('-i', input);
    });
    
    // Create filter complex for concatenation
    const filterInputs = inputs.map((_, index) => `[${index}:v][${index}:a]`).join('');
    const filterComplex = `${filterInputs}concat=n=${inputs.length}:v=1:a=1[outv][outa]`;
    
    args.push('-filter_complex', filterComplex);
    args.push('-map', '[outv]', '-map', '[outa]');
    args.push('-y', output);
    
    await this.ffmpeg.execute(args);
    return `Successfully merged ${inputs.length} videos into ${output}`;
  }

  async concatenateVideos(inputs: string[], output: string): Promise<string> {
    if (inputs.length < 2) {
      throw new Error('At least 2 input files are required for concatenation');
    }
    
    inputs.forEach(input => validateFilePath(input));
    validateOutputPath(output);
    
    // Create a temporary file list
    const fileList = inputs.map(input => `file '${input}'`).join('\n');
    const tempListFile = '/tmp/ffmpeg_concat_list.txt';
    
    fs.writeFileSync(tempListFile, fileList);
    
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', tempListFile,
      '-c', 'copy',
      '-y', output
    ];
    
    await this.ffmpeg.execute(args);
    
    // Clean up temp file
    fs.unlinkSync(tempListFile);
    
    return `Successfully concatenated ${inputs.length} videos into ${output}`;
  }
}
