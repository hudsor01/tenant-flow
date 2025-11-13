#!/bin/bash
# Helper script to run NVM commands in the proper shell environment

# Check if we're already in zsh
if [[ "$0" == *"zsh"* ]]; then
    # We're already in zsh, so we can run the command directly
    eval "$@"
else
    # Run the command in a login interactive zsh shell
    zsh -li -c "$@"
fi