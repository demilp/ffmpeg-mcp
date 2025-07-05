export interface MediaInfo {
  duration: number;
  bitrate: number;
  format: string;
  codec: string;
  width?: number;
  height?: number;
  fps?: number;
  audio_codec?: string;
  audio_bitrate?: number;
  size: number;
  streams?: StreamInfo[];
  chapters?: ChapterInfo[];
}

export interface StreamInfo {
  index: number;
  type: 'video' | 'audio' | 'subtitle' | 'data';
  codec: string;
  language?: string;
  title?: string;
  bitrate?: number;
  duration?: number;
}

export interface ChapterInfo {
  id: number;
  start: number;
  end: number;
  title?: string;
}

export interface ConversionOptions {
  input: string;
  output: string;
  format?: string;
  quality?: 'high' | 'medium' | 'low';
  codec?: string;
  bitrate?: string;
  preset?: string;
  hwaccel?: boolean;
}

export interface ResizeOptions {
  input: string;
  output: string;
  width: number;
  height: number;
  maintain_aspect?: boolean;
  scale_filter?: string;
}

export interface GifOptions {
  input: string;
  output: string;
  start_time?: string;
  duration?: string;
  fps?: number;
  scale?: string;
  palette?: boolean;
}

export interface WatermarkOptions {
  input: string;
  output: string;
  watermark_text?: string;
  watermark_image?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  font_size?: number;
  font_color?: string;
}

export interface FFmpegProgress {
  percent: number;
  currentTime: string;
  targetSize: number;
  speed: string;
  fps?: number;
  bitrate?: string;
  eta?: string;
}

export interface ProcessingJob {
  id: string;
  type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: FFmpegProgress;
  startTime?: number;
  endTime?: number;
  error?: string;
}

export interface SecurityReport {
  blocked_requests: number;
  rate_limited_ips: string[];
  suspicious_activity: Array<{
    timestamp: number;
    ip: string;
    action: string;
    details: string;
  }>;
}
