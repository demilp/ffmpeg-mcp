import { FFmpegExecutor } from './ffmpeg.js';
import { Logger } from './logger.js';
import { SecurityManager } from './security.js';
import { defaultConfig } from '../config/index.js';

export function createDefaultFFmpegExecutor(): FFmpegExecutor {
  const logger = new Logger(defaultConfig.logging);
  const security = new SecurityManager(defaultConfig.security, logger);
  return new FFmpegExecutor(defaultConfig.ffmpeg, logger, security);
}
