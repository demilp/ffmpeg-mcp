import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_VIDEO_FORMATS, SUPPORTED_AUDIO_FORMATS } from './constants.js';

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
