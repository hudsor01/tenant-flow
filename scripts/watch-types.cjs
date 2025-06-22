const chokidar = require('chokidar');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Database Type Watcher Script
 * 
 * Watches for database schema changes and automatically regenerates TypeScript types.
 * This script monitors SQL migration files and triggers type generation when changes are detected.
 */

console.log('👀 Starting database type watcher...');

// Paths to watch for schema changes
const watchPaths = [
  path.join(__dirname, '..', 'supabase', 'migrations'),
  path.join(__dirname, '..', 'supabase', '*.sql'),
  path.join(__dirname, '..', 'supabase', 'functions')
];

// Configuration
const DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before regenerating
let timeoutId = null;

// Initialize file watcher
const watcher = chokidar.watch(watchPaths, {
  ignored: [
    /node_modules/,
    /\.git/,
    /\.DS_Store/,
    /.*\.log$/,
    /.*\.tmp$/
  ],
  persistent: true,
  ignoreInitial: true, // Don't trigger on startup
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100
  }
});

// Event handlers
watcher
  .on('ready', () => {
    console.log('✅ Watcher ready. Monitoring for database schema changes...');
    console.log('📁 Watching paths:');
    watchPaths.forEach(path => console.log(`   - ${path}`));
    console.log('');
    console.log('💡 Tip: Save a .sql file in supabase/ directory to trigger type regeneration');
    console.log('🛑 Press Ctrl+C to stop watching');
  })
  .on('add', handleFileChange)
  .on('change', handleFileChange)
  .on('unlink', handleFileChange)
  .on('error', error => {
    console.error('❌ Watcher error:', error);
  });

/**
 * Handle file system changes with debouncing
 */
function handleFileChange(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`📝 Detected change: ${relativePath}`);
  
  // Clear existing timeout
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  
  // Set new timeout for debounced regeneration
  timeoutId = setTimeout(() => {
    regenerateTypes();
  }, DEBOUNCE_MS);
}

/**
 * Regenerate database types
 */
function regenerateTypes() {
  console.log('\n🔄 Regenerating database types...');
  
  try {
    const startTime = Date.now();
    
    // Run the type generation script
    execSync('node scripts/generate-types-psql.cjs', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Types regenerated successfully in ${duration}ms`);
    console.log('📡 Watching for more changes...\n');
    
  } catch (error) {
    console.error('❌ Type regeneration failed:', error.message);
    console.log('📡 Continuing to watch for changes...\n');
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping type watcher...');
  watcher.close().then(() => {
    console.log('✅ Watcher stopped. Goodbye!');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  watcher.close().then(() => {
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  watcher.close().then(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  watcher.close().then(() => {
    process.exit(1);
  });
});