export const SUPPORTED_VIDEO_FORMATS = [
  'mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'm4v'
];

export const SUPPORTED_AUDIO_FORMATS = [
  'mp3', 'wav', 'aac', 'flac', 'ogg', 'wma', 'm4a'
];

export const QUALITY_PRESETS = {
  high: { crf: '18', preset: 'slow' },
  medium: { crf: '23', preset: 'medium' },
  low: { crf: '28', preset: 'fast' }
};

export const POSITION_FILTERS = {
  'top-left': '10:10',
  'top-right': 'w-tw-10:10',
  'bottom-left': '10:h-th-10',
  'bottom-right': 'w-tw-10:h-th-10',
  'center': '(w-tw)/2:(h-th)/2'
};
