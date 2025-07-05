export interface ServerConfig {
  security: {
    maxFileSize: number; // in bytes
    maxProcessingTime: number; // in seconds
    rateLimitWindow: number; // in seconds
    rateLimitMaxRequests: number;
    allowedDirectories: string[];
    blockedExtensions: string[];
    tempDirectory: string;
  };
  performance: {
    enableCaching: boolean;
    cacheSize: number;
    enableHardwareAcceleration: boolean;
    maxConcurrentJobs: number;
    queueTimeout: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableFileLogging: boolean;
    logDirectory: string;
    maxLogSize: number;
  };
  ffmpeg: {
    path: string;
    timeout: number;
    defaultPreset: string;
    enableGPU: boolean;
    hwAccelOptions: {
      nvidia: string[];
      intel: string[];
      amd: string[];
      apple: string[];
      macos: string[];
    };
  };
}

export const defaultConfig: ServerConfig = {
  security: {
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
    maxProcessingTime: 3600, // 1 hour
    rateLimitWindow: 60, // 1 minute
    rateLimitMaxRequests: 10,
    allowedDirectories: ['/tmp', '/var/tmp', process.cwd()],
    blockedExtensions: ['.exe', '.bat', '.sh', '.ps1'],
    tempDirectory: '/tmp/ffmpeg-mcp'
  },
  performance: {
    enableCaching: true,
    cacheSize: 1000,
    enableHardwareAcceleration: true,
    maxConcurrentJobs: 3,
    queueTimeout: 300000 // 5 minutes
  },
  logging: {
    level: 'info',
    enableFileLogging: true,
    logDirectory: './logs',
    maxLogSize: 10 * 1024 * 1024 // 10MB
  },
  ffmpeg: {
    path: 'ffmpeg',
    timeout: 3600000, // 1 hour
    defaultPreset: 'medium',
    enableGPU: true,
    hwAccelOptions: {
      nvidia: ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda'],
      intel: ['-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv'],
      amd: ['-hwaccel', 'opencl'],
      apple: ['-hwaccel', 'videotoolbox'],
      macos: ['-hwaccel', 'videotoolbox']
    }
  }
};
