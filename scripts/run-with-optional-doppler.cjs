#!/usr/bin/env node

const { execSync } = require('child_process');

const joinArgs = (args) => args.map((arg) => {
  if (/^[A-Za-z0-9_./:-]+$/.test(arg)) {
    return arg;
  }

  const escaped = arg.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}).join(' ');

const normalize = (value) => value === undefined ? '' : String(value).toLowerCase();

const originalArgs = process.argv.slice(2);

if (originalArgs.length === 0) {
  console.error('Usage: node scripts/run-with-optional-doppler.cjs <command> [args...]');
  process.exit(1);
}

const dopplerDisabled = ['1', 'true', 'yes'].includes(normalize(process.env.DOPPLER_DISABLED));

let dopplerAvailable = false;

if (!dopplerDisabled) {
  try {
    execSync('doppler --version', { stdio: 'ignore' });
    dopplerAvailable = true;
  } catch (error) {
    dopplerAvailable = false;
  }
}

const commandString = joinArgs(originalArgs);
const finalCommand = dopplerAvailable
  ? `doppler run -- ${commandString}`
  : commandString;

if (!dopplerAvailable && !dopplerDisabled) {
  console.log('Doppler CLI not found; running command without secrets.');
}

try {
  execSync(finalCommand, { stdio: 'inherit', env: process.env, shell: true });
} catch (error) {
  if (error.status !== undefined) {
    process.exit(error.status);
  }

  throw error;
}
