import * as fs from 'fs';
import * as path from 'path';
import { ServerConfig } from '../config/index.js';
import { Logger } from './logger.js';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class SecurityManager {
  private config: ServerConfig['security'];
  private logger: Logger;
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private blockedIPs: Set<string> = new Set();

  constructor(config: ServerConfig['security'], logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.setupTempDirectory();
    this.startCleanupInterval();
  }

  private setupTempDirectory(): void {
    if (!fs.existsSync(this.config.tempDirectory)) {
      fs.mkdirSync(this.config.tempDirectory, { recursive: true, mode: 0o700 });
      this.logger.info(`Created secure temp directory: ${this.config.tempDirectory}`);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupRateLimitMap();
      this.cleanupTempDirectory();
    }, 60000); // Clean up every minute
  }

  private cleanupRateLimitMap(): void {
    const now = Date.now();
    for (const [ip, entry] of this.rateLimitMap.entries()) {
      if (now - entry.windowStart > this.config.rateLimitWindow * 1000) {
        this.rateLimitMap.delete(ip);
      }
    }
  }

  private cleanupTempDirectory(): void {
    try {
      const files = fs.readdirSync(this.config.tempDirectory);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.config.tempDirectory, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          this.logger.debug(`Cleaned up old temp file: ${filePath}`);
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning temp directory:', error);
    }
  }

  checkRateLimit(clientId: string): boolean {
    if (this.blockedIPs.has(clientId)) {
      this.logger.warn(`Blocked IP attempted access: ${clientId}`);
      return false;
    }

    const now = Date.now();
    const entry = this.rateLimitMap.get(clientId);

    if (!entry) {
      this.rateLimitMap.set(clientId, { count: 1, windowStart: now });
      return true;
    }

    if (now - entry.windowStart > this.config.rateLimitWindow * 1000) {
      entry.count = 1;
      entry.windowStart = now;
      return true;
    }

    entry.count++;
    if (entry.count > this.config.rateLimitMaxRequests) {
      this.logger.warn(`Rate limit exceeded for client: ${clientId}`);
      this.blockedIPs.add(clientId);
      return false;
    }

    return true;
  }

  validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }

    // Resolve to absolute path
    const resolvedPath = path.resolve(filePath);
    
    // Check for directory traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      this.logger.warn(`Directory traversal attempt: ${filePath}`);
      throw new Error('Invalid file path: directory traversal not allowed');
    }

    // Check if path is within allowed directories
    const isAllowed = this.config.allowedDirectories.some(dir => 
      resolvedPath.startsWith(path.resolve(dir))
    );

    if (!isAllowed) {
      this.logger.warn(`Access to restricted path: ${resolvedPath}`);
      throw new Error('Access to this directory is not allowed');
    }

    // Check for blocked extensions
    const ext = path.extname(filePath).toLowerCase();
    if (this.config.blockedExtensions.includes(ext)) {
      this.logger.warn(`Blocked file extension: ${ext}`);
      throw new Error(`File extension '${ext}' is not allowed`);
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
  }

  validateFileSize(filePath: string): void {
    const stats = fs.statSync(filePath);
    if (stats.size > this.config.maxFileSize) {
      this.logger.warn(`File too large: ${filePath} (${stats.size} bytes)`);
      throw new Error(`File size exceeds limit of ${this.config.maxFileSize} bytes`);
    }
  }

  sanitizeFFmpegArgs(args: string[]): string[] {
    const sanitized: string[] = [];
    const dangerousFlags = [
      '-f', 'lavfi',
      '-protocol_whitelist',
      '-safe', '0',
      '-f', 'concat'
    ];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      // Check for dangerous flag combinations
      if (dangerousFlags.includes(arg)) {
        this.logger.warn(`Blocked dangerous FFmpeg flag: ${arg}`);
        continue;
      }

      // Block dangerous input formats specifically
      if (arg === '-i' && i + 1 < args.length && args[i + 1] === 'pipe:') {
        this.logger.warn(`Blocked dangerous FFmpeg flag combination: ${arg} ${args[i + 1]}`);
        i++; // Skip the next argument too
        continue;
      }

      // Sanitize file paths
      if (arg.startsWith('/') || arg.startsWith('./') || arg.startsWith('../')) {
        try {
          this.validateFilePath(arg);
        } catch (error) {
          this.logger.warn(`Invalid file path in FFmpeg args: ${arg}`);
          continue;
        }
      }

      sanitized.push(arg);
    }

    return sanitized;
  }

  createSecureTempFile(extension: string = '.tmp'): string {
    const filename = `ffmpeg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
    return path.join(this.config.tempDirectory, filename);
  }

  isProcessingTimeExceeded(startTime: number): boolean {
    const elapsed = (Date.now() - startTime) / 1000;
    return elapsed > this.config.maxProcessingTime;
  }
}
