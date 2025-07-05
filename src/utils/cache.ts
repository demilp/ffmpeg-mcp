import { ServerConfig } from '../config/index.js';
import { Logger } from './logger.js';
import { MediaInfo } from '../types/index.js';
import * as fs from 'fs';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
}

export class CacheManager {
  private config: ServerConfig['performance'];
  private logger: Logger;
  private mediaInfoCache: Map<string, CacheEntry<MediaInfo>> = new Map();
  private maxSize: number;

  constructor(config: ServerConfig['performance'], logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.maxSize = config.cacheSize;
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 300000); // Clean up every 5 minutes
  }

  private cleanupCache(): void {
    if (this.mediaInfoCache.size <= this.maxSize) return;

    // Sort by access count and timestamp (LRU with access frequency)
    const entries = Array.from(this.mediaInfoCache.entries())
      .sort((a, b) => {
        const scoreA = a[1].accessCount / (Date.now() - a[1].timestamp);
        const scoreB = b[1].accessCount / (Date.now() - b[1].timestamp);
        return scoreA - scoreB;
      });

    // Remove least valuable entries
    const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.2));
    toRemove.forEach(([key]) => {
      this.mediaInfoCache.delete(key);
    });

    this.logger.debug(`Cache cleanup: removed ${toRemove.length} entries`);
  }

  private generateCacheKey(filePath: string, operation: string): string {
    return `${operation}:${filePath}`;
  }

  getMediaInfo(filePath: string): MediaInfo | null {
    if (!this.config.enableCaching) return null;

    const key = this.generateCacheKey(filePath, 'mediaInfo');
    const entry = this.mediaInfoCache.get(key);

    if (!entry) return null;

    // Check if entry is still valid (file hasn't been modified)
    try {
      const stats = fs.statSync(filePath);
      if (stats.mtime.getTime() > entry.timestamp) {
        this.mediaInfoCache.delete(key);
        return null;
      }
    } catch (error) {
      this.mediaInfoCache.delete(key);
      return null;
    }

    // Update access count
    entry.accessCount++;
    
    this.logger.debug(`Cache hit for media info: ${filePath}`);
    return entry.data;
  }

  setMediaInfo(filePath: string, info: MediaInfo): void {
    if (!this.config.enableCaching) return;

    const key = this.generateCacheKey(filePath, 'mediaInfo');
    const entry: CacheEntry<MediaInfo> = {
      data: info,
      timestamp: Date.now(),
      accessCount: 1
    };

    this.mediaInfoCache.set(key, entry);
    this.logger.debug(`Cached media info: ${filePath}`);

    // Trigger cleanup if cache is getting too large
    if (this.mediaInfoCache.size > this.maxSize * 1.2) {
      this.cleanupCache();
    }
  }

  invalidateMediaInfo(filePath: string): void {
    const key = this.generateCacheKey(filePath, 'mediaInfo');
    this.mediaInfoCache.delete(key);
    this.logger.debug(`Invalidated cache for: ${filePath}`);
  }

  getCacheStats(): { size: number; hitRate: number } {
    const totalAccess = Array.from(this.mediaInfoCache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      size: this.mediaInfoCache.size,
      hitRate: totalAccess > 0 ? (totalAccess / this.mediaInfoCache.size) : 0
    };
  }

  clearCache(): void {
    this.mediaInfoCache.clear();
    this.logger.info('Cache cleared');
  }
}
