# FFmpeg MCP Server

A production-ready FFmpeg MCP (Model Context Protocol) server that exposes comprehensive multimedia processing capabilities through a standardized interface. This server implements advanced security features, performance optimizations, and extensive FFmpeg functionality.

## 🎯 Features

### Core FFmpeg Tools
- **Media Info Analysis** - Detailed media file information extraction
- **Video Conversion** - Format conversion with quality presets and codec control
- **Audio Extraction** - Extract audio in multiple formats (MP3, AAC, WAV, FLAC, OGG)
- **Video Resizing** - Resize videos with aspect ratio control
- **GIF Creation** - Convert videos to optimized animated GIFs
- **Video Merging** - Merge and concatenate multiple video files
- **Watermarking** - Add text and image watermarks

### Advanced Media Processing
- **Subtitle Support** - Extract, embed, and burn subtitles
- **Custom Filters** - Apply custom FFmpeg filter chains
- **Video Enhancement** - Denoise, color correction, stabilization
- **Time Effects** - Slow motion and time-lapse creation
- **Video Cropping** - Precise video cropping operations

### Batch Processing
- **Multi-file Operations** - Process multiple files simultaneously
- **Job Queue System** - Concurrent processing with progress tracking
- **Batch Status Monitoring** - Real-time job progress reporting

### Security Features
- **Path Validation** - Directory traversal protection
- **File Size Limits** - Configurable file size restrictions
- **Rate Limiting** - Request rate limiting per client
- **Argument Sanitization** - FFmpeg argument validation
- **Secure Temp Directories** - Isolated temporary file management

### Performance Optimizations
- **Media Info Caching** - Intelligent caching for frequently accessed files
- **Hardware Acceleration** - GPU acceleration support (NVIDIA, Intel, AMD)
- **Streaming Support** - Efficient handling of large files
- **Resource Monitoring** - Memory and CPU usage tracking

### Infrastructure
- **Comprehensive Logging** - Structured logging with configurable levels
- **External Configuration** - JSON-based configuration management
- **Error Recovery** - Robust error handling and recovery mechanisms
- **Progress Reporting** - Real-time operation progress updates

## Prerequisites

- Node.js 18 or higher
- FFmpeg installed and accessible in PATH
- TypeScript for development

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ffmpeg-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Running the Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Available Tools

1. **get_media_info**: Get media file information
2. **convert_video**: Convert video formats
3. **extract_audio**: Extract audio from video
4. **resize_video**: Resize video dimensions
5. **create_gif**: Create animated GIFs
6. **merge_videos**: Merge multiple videos
7. **concatenate_videos**: Concatenate videos without re-encoding
8. **add_text_watermark**: Add text watermarks
9. **add_image_watermark**: Add image watermarks

## Configuration

### For Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "ffmpeg": {
      "command": "node",
      "args": ["/path/to/ffmpeg-mcp-server/build/index.js"]
    }
  }
}
```

## Security

- File path validation prevents directory traversal
- Input sanitization for FFmpeg arguments
- File format validation
- Size and resolution limits

## License

MIT License
