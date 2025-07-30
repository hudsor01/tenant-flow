#!/usr/bin/env node

// Simple script to run the backend development server
const { spawn } = require('child_process');
const path = require('path');

// First run prisma generate
console.log('Running prisma generate...');
const prismaGenerate = spawn('npx', ['prisma', 'generate'], {
  stdio: 'inherit',
  cwd: __dirname
});

prismaGenerate.on('close', (code) => {
  if (code !== 0) {
    console.error('Prisma generate failed');
    process.exit(code);
  }

  console.log('Starting development server...');
  // Run tsx instead of ts-node for better compatibility
  const server = spawn('npx', ['tsx', 'watch', 'src/main.ts'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env }
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    server.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
    process.exit(0);
  });
});