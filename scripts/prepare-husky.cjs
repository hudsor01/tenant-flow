#!/usr/bin/env node
/* eslint-env node */

const normalize = (value) => value === undefined ? undefined : String(value).toLowerCase();

const shouldSkip = () => {
  const husky = normalize(process.env.HUSKY);
  if (husky === '0' || husky === 'false') {
    return true;
  }

  const skipInstall = normalize(process.env.HUSKY_SKIP_INSTALL);
  return skipInstall === '1' || skipInstall === 'true';
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
