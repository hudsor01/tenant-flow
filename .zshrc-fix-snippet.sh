#!/bin/bash
# ===========================================================================
# INSTRUCTIONS FOR FIXING .zshrc
# ===========================================================================
# 
# 1. Remove the DUPLICATE Oh My Posh initialization on line 8:
#    DELETE THIS LINE: eval "$(oh-my-posh init zsh)"
#
# 2. Keep only the config-specific initialization at the bottom
#    (it's already correct)
#
# Your .zshrc should have ONLY ONE Oh My Posh init line at the bottom:
# eval "$(oh-my-posh init zsh --config ~/.config/ohmyposh/tokyo-night.omp.json)"
#
# ===========================================================================

# After fixing .zshrc, copy the fixed config:
# cp ~/.ohmyposh-fixed.json ~/.config/ohmyposh/tokyo-night.omp.json

# Then reload your shell:
# exec zsh
