import { spawn } from 'child_process';
import { FFmpegProgress } from '../types/index.js';
import { ServerConfig } from '../config/index.js';
import { Logger } from './logger.js';
import { SecurityManager } from './security.js';

export class FFmpegExecutor {
  private ffmpegPath: string;
  private config: ServerConfig['ffmpeg'];
  private logger: Logger;
  private security: SecurityManager;

  constructor(config: ServerConfig['ffmpeg'], logger: Logger, security: SecurityManager) {
    this.config = config;
    this.logger = logger;
    this.security = security;
    this.ffmpegPath = this.detectFFmpegPath();
  }

  private detectFFmpegPath(): string {
    // Use configured path or detect automatically
    if (this.config.path !== 'ffmpeg') {
      return this.config.path;
    }

    // Try common paths
    const commonPaths = [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg',
      'ffmpeg' // Assume it's in PATH
    ];
    
    return 'ffmpeg';
  }

  private detectHardwareAcceleration(): string[] {
    if (!this.config.enableGPU) return [];

    // Try to detect available hardware acceleration
    // This is a simplified detection - in production, you'd want to probe the system
    const platform = process.platform;
    
    if (platform === 'darwin') {
      // macOS - try VideoToolbox
      return ['-hwaccel', 'videotoolbox'];
    } else if (platform === 'linux') {
      // Linux - try NVIDIA first, then Intel QSV
      return this.config.hwAccelOptions.nvidia;
    } else if (platform === 'win32') {
      // Windows - try DirectX Video Acceleration
      return ['-hwaccel', 'dxva2'];
    }

    return [];
  }

  private addHardwareAcceleration(args: string[]): string[] {
    if (!this.config.enableGPU) return args;

    const hwArgs = this.detectHardwareAcceleration();
    if (hwArgs.length > 0) {
      this.logger.debug('Adding hardware acceleration:', hwArgs);
      
      // Find the first -i flag and insert hwaccel before it
      const inputIndex = args.findIndex(arg => arg === '-i');
      if (inputIndex > 0) {
        // Insert hardware acceleration before the first input
        const result = [...args.slice(0, inputIndex), ...hwArgs, ...args.slice(inputIndex)];
        return result;
      }
    }

    return args;
  }

  public async execute(args: string[]): Promise<string> {
    const startTime = Date.now();
    
    // Sanitize arguments
    const sanitizedArgs = this.security.sanitizeFFmpegArgs(args);
    
    // Add hardware acceleration if enabled
    const finalArgs = this.addHardwareAcceleration(sanitizedArgs);
    
    this.logger.debug('Executing FFmpeg:', { args: finalArgs });

    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, finalArgs, {
        timeout: this.config.timeout
      });
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data: any) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data: any) => {
        stderr += data.toString();
        
        // Check for processing time limit
        if (this.security.isProcessingTimeExceeded(startTime)) {
          process.kill('SIGTERM');
          reject(new Error('Processing time limit exceeded'));
          return;
        }
      });

      process.on('close', (code: any) => {
        const duration = Date.now() - startTime;
        this.logger.debug(`FFmpeg process completed in ${duration}ms with code ${code}`);
        
        if (code === 0) {
          resolve(stdout);
        } else {
          this.logger.error('FFmpeg failed:', { code, stderr });
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error: any) => {
        this.logger.error('FFmpeg process error:', error);
        reject(new Error(`Failed to start FFmpeg: ${error.message}`));
      });

      // Handle timeout
      process.on('timeout', () => {
        this.logger.error('FFmpeg process timed out');
        reject(new Error('FFmpeg process timed out'));
      });
    });
  }

  public async executeWithProgress(
    args: string[],
    onProgress?: (progress: FFmpegProgress) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data: any) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data: any) => {
        const chunk = data.toString();
        stderr += chunk;
        
        if (onProgress) {
          const progress = this.parseProgress(chunk);
          if (progress) {
            onProgress(progress);
          }
        }
      });

      process.on('close', (code: any) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error: any) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`));
      });
    });
  }

  private parseProgress(output: string): FFmpegProgress | null {
    // Parse FFmpeg progress output
    const timeMatch = output.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
    const sizeMatch = output.match(/size=\s*(\d+)kB/);
    const speedMatch = output.match(/speed=\s*([\d.]+)x/);
    
    if (timeMatch) {
      return {
        percent: 0, // Would need duration to calculate
        currentTime: timeMatch[1],
        targetSize: sizeMatch ? parseInt(sizeMatch[1]) : 0,
        speed: speedMatch ? speedMatch[1] : '0'
      };
    }
    
    return null;
  }
}
