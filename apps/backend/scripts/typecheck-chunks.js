#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Memory-optimized chunked TypeScript compilation
 * Compiles large codebases in smaller chunks to prevent OOM errors
 */

const CHUNK_SIZE = 20; // Files per chunk
const MAX_MEMORY = '4096'; // MB per chunk

async function getTypeScriptFiles() {
  const srcDir = path.join(__dirname, '../src');
  const files = [];
  
  function walkDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('test') && !item.includes('spec')) {
        walkDir(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts') && !item.includes('.test.') && !item.includes('.spec.')) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(srcDir);
  return files;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function typecheckChunk(files, chunkIndex) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Typechecking chunk ${chunkIndex + 1} (${files.length} files)...`);
    
    const tscProcess = spawn('npx', [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--isolatedModules',
      '--incremental',
      '--tsBuildInfoFile', `./.tsc-chunk-${chunkIndex}.tsbuildinfo`,
      ...files
    ], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=${MAX_MEMORY}`,
        TS_NODE_COMPILER_OPTIONS: JSON.stringify({
          skipLibCheck: true,
          skipDefaultLibCheck: true
        })
      },
      stdio: 'inherit'
    });

    tscProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Chunk ${chunkIndex + 1} passed`);
        resolve();
      } else {
        console.log(`❌ Chunk ${chunkIndex + 1} failed with code ${chunkIndex + 1}`);
        reject(new Error(`TypeScript chunk ${chunkIndex + 1} failed`));
      }
    });

    tscProcess.on('error', (error) => {
      console.error(`❌ Failed to start TypeScript for chunk ${chunkIndex + 1}:`, error);
      reject(error);
    });
  });
}

async function cleanupBuildInfo() {
  const buildInfoFiles = fs.readdirSync(path.join(__dirname, '..'))
    .filter(file => file.startsWith('.tsc-chunk-') && file.endsWith('.tsbuildinfo'));
  
  for (const file of buildInfoFiles) {
    try {
      fs.unlinkSync(path.join(__dirname, '..', file));
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

async function main() {
  try {
    console.log('🚀 Starting chunked TypeScript compilation...');
    
    const files = await getTypeScriptFiles();
    console.log(`📁 Found ${files.length} TypeScript files`);
    
    const chunks = chunkArray(files, CHUNK_SIZE);
    console.log(`📦 Split into ${chunks.length} chunks of ~${CHUNK_SIZE} files each`);
    
    let errors = [];
    
    for (let i = 0; i < chunks.length; i++) {
      try {
        await typecheckChunk(chunks[i], i);
      } catch (error) {
        errors.push(`Chunk ${i + 1}: ${error.message}`);
      }
      
      // Force garbage collection between chunks
      if (global.gc) {
        global.gc();
      }
      
      // Small delay to let memory settle
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    await cleanupBuildInfo();
    
    if (errors.length > 0) {
      console.log('\n❌ TypeScript compilation failed:');
      errors.forEach(error => console.log(`  - ${error}`));
      process.exit(1);
    } else {
      console.log('\n✅ All TypeScript chunks passed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during chunked compilation:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}