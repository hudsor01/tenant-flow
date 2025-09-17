#!/usr/bin/env sh

# Husky v9.1.7 initialization script
# Sets up environment for git hooks

# Handle GUI applications (SourceTree, VS Code, etc.)
if [ -z "$NODE_PATH" ] && [ -x "$(command -v node)" ]; then
  export NODE_PATH=$(npm root -g)
fi

# Support for version managers (nvm, fnm, volta)
if [ -f ~/.nvm/nvm.sh ]; then
  . ~/.nvm/nvm.sh
elif [ -f ~/.fnm/fnm.sh ]; then
  . ~/.fnm/fnm.sh
fi

# Set PATH for node and npm
export PATH="$PATH:./node_modules/.bin"

# Enable Turbo cache
export TURBO_CACHE_DIR=".turbo"

# Set concurrency for optimal performance
export TURBO_CONCURRENCY=10

# Skip tests in CI environment (they run separately)
if [ "$CI" = "true" ]; then
  export SKIP_TESTS=true
fi