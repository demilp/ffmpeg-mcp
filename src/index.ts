#!/usr/bin/env node

import { FFmpegMCPServer } from './server.js';

async function main() {
  const server = new FFmpegMCPServer();
  await server.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
