import { ServerConfig } from '../config/index.js';
import { Logger } from './logger.js';
import { FFmpegProgress } from '../types/index.js';

export interface Job {
  id: string;
  type: string;
  args: any;
  priority: number;
  startTime?: number;
  onProgress?: (progress: FFmpegProgress) => void;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export class JobQueue {
  private config: ServerConfig['performance'];
  private logger: Logger;
  private queue: Job[] = [];
  private running: Map<string, Job> = new Map();
  private completed: Map<string, { result: any; timestamp: number }> = new Map();

  constructor(config: ServerConfig['performance'], logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.startProcessor();
  }

  private startProcessor(): void {
    setInterval(() => {
      this.processQueue();
      this.cleanupCompleted();
    }, 1000);
  }

  private processQueue(): void {
    if (this.running.size >= this.config.maxConcurrentJobs) return;
    if (this.queue.length === 0) return;

    // Sort by priority (higher first)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    const job = this.queue.shift()!;
    this.startJob(job);
  }

  private async startJob(job: Job): Promise<void> {
    job.startTime = Date.now();
    this.running.set(job.id, job);
    
    this.logger.info(`Starting job: ${job.id} (${job.type})`);

    try {
      // Check for timeout
      const timeoutId = setTimeout(() => {
        job.reject(new Error(`Job ${job.id} timed out after ${this.config.queueTimeout}ms`));
        this.running.delete(job.id);
      }, this.config.queueTimeout);

      // Execute the job (this would be implemented by the specific tool)
      const result = await this.executeJob(job);
      
      clearTimeout(timeoutId);
      
      this.completed.set(job.id, { result, timestamp: Date.now() });
      this.running.delete(job.id);
      
      job.resolve(result);
      this.logger.info(`Completed job: ${job.id}`);
      
    } catch (error) {
      this.running.delete(job.id);
      job.reject(error as Error);
      this.logger.error(`Failed job: ${job.id}`, error);
    }
  }

  private async executeJob(job: Job): Promise<any> {
    // This is a placeholder - actual execution would be handled by the specific tools
    throw new Error('Job execution not implemented in base class');
  }

  private cleanupCompleted(): void {
    const now = Date.now();
    const maxAge = 60000; // Keep completed jobs for 1 minute

    for (const [id, entry] of this.completed.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.completed.delete(id);
      }
    }
  }

  addJob(type: string, args: any, priority: number = 0): Promise<any> {
    return new Promise((resolve, reject) => {
      const job: Job = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        args,
        priority,
        resolve,
        reject
      };

      this.queue.push(job);
      this.logger.debug(`Queued job: ${job.id} (${type})`);
    });
  }

  getJobStatus(jobId: string): 'queued' | 'running' | 'completed' | 'not_found' {
    if (this.queue.some(job => job.id === jobId)) return 'queued';
    if (this.running.has(jobId)) return 'running';
    if (this.completed.has(jobId)) return 'completed';
    return 'not_found';
  }

  getQueueStats(): { queued: number; running: number; completed: number } {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completed.size
    };
  }

  cancelJob(jobId: string): boolean {
    // Remove from queue
    const queueIndex = this.queue.findIndex(job => job.id === jobId);
    if (queueIndex !== -1) {
      const job = this.queue.splice(queueIndex, 1)[0];
      job.reject(new Error('Job cancelled'));
      return true;
    }

    // Cancel running job
    const runningJob = this.running.get(jobId);
    if (runningJob) {
      runningJob.reject(new Error('Job cancelled'));
      this.running.delete(jobId);
      return true;
    }

    return false;
  }
}
