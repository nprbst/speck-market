#!/usr/bin/env bash
# Speck Plugin Environment Setup Hook
# Runs on SessionStart to configure SPECK_PLUGIN_ROOT environment variable

# Check if CLAUDE_ENV_FILE is set (Claude Code provides this)
if [ -n "$CLAUDE_ENV_FILE" ]; then
  # Check if CLAUDE_PLUGIN_ROOT is set (indicates running from installed plugin)
  if [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
    # Set SPECK_PLUGIN_ROOT to point to .speck directory within plugin
    echo "export SPECK_PLUGIN_ROOT=\"${CLAUDE_PLUGIN_ROOT}/.speck\"" >> "$CLAUDE_ENV_FILE"
  fi
  exit 0
fi

# If CLAUDE_ENV_FILE is not set, nothing to do
exit 0
