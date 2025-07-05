import * as fs from 'fs';
import * as path from 'path';
import { ServerConfig } from '../config/index.js';

export class Logger {
  private config: ServerConfig['logging'];
  private logFile?: string;

  constructor(config: ServerConfig['logging']) {
    this.config = config;
    
    if (this.config.enableFileLogging) {
      this.setupFileLogging();
    }
  }

  private setupFileLogging(): void {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    this.logFile = path.join(this.config.logDirectory, `ffmpeg-mcp-${timestamp}.log`);
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.level);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  private writeToFile(message: string): void {
    if (!this.logFile) return;
    
    try {
      // Check file size and rotate if necessary
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.config.maxLogSize) {
          const rotatedFile = this.logFile.replace('.log', `-${Date.now()}.log`);
          fs.renameSync(this.logFile, rotatedFile);
        }
      }
      
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  debug(message: string, meta?: any): void {
    if (!this.shouldLog('debug')) return;
    
    const formatted = this.formatMessage('debug', message, meta);
    console.debug(formatted);
    
    if (this.config.enableFileLogging) {
      this.writeToFile(formatted);
    }
  }

  info(message: string, meta?: any): void {
    if (!this.shouldLog('info')) return;
    
    const formatted = this.formatMessage('info', message, meta);
    console.info(formatted);
    
    if (this.config.enableFileLogging) {
      this.writeToFile(formatted);
    }
  }

  warn(message: string, meta?: any): void {
    if (!this.shouldLog('warn')) return;
    
    const formatted = this.formatMessage('warn', message, meta);
    console.warn(formatted);
    
    if (this.config.enableFileLogging) {
      this.writeToFile(formatted);
    }
  }

  error(message: string, meta?: any): void {
    if (!this.shouldLog('error')) return;
    
    const formatted = this.formatMessage('error', message, meta);
    console.error(formatted);
    
    if (this.config.enableFileLogging) {
      this.writeToFile(formatted);
    }
  }
}
