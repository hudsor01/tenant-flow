#!/usr/bin/env node
/* eslint-env node */

const normalize = (value) => value === undefined ? undefined : String(value).toLowerCase();

const shouldSkip = () => {
  const husky = normalize(process.env.HUSKY);
  if (husky === '0' || husky === 'false') {
    return true;
  }

  const skipInstall = normalize(process.env.HUSKY_SKIP_INSTALL);
  if (skipInstall === '1' || skipInstall === 'true') {
    return true;
  }

  // Skip in CI/production environments
  const isCI = process.env.CI === 'true' || process.env.CI === '1';
  const isVercel = process.env.VERCEL === '1';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isCI || isVercel || isProduction) {
    return true;
  }

  return false;
};

if (shouldSkip()) {
  console.log('Skipping husky install: disabled via environment variable.');
  process.exit(0);
}

try {
  const huskyModule = require('husky');
  const husky = typeof huskyModule === 'function' ? huskyModule : huskyModule?.default;

  if (typeof husky === 'function') {
    husky();
  } else if (typeof huskyModule?.install === 'function') {
    huskyModule.install();
  } else {
    console.warn('Skipping husky install: no callable install entry found.');
  }
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND') {
    console.log('Skipping husky install: dependency not present (likely production install).');
    process.exit(0);
  }

  console.error('Failed to run husky install:', error);
  process.exit(1);
}