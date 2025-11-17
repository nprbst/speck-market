#!/usr/bin/env bash
# Speck Plugin Environment Setup Hook
# Runs on SessionStart to write plugin path to .speck/plugin-path

# If CLAUDE_PLUGIN_ROOT is available, write it to .speck/plugin-path
if [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
  # Create .speck directory if it doesn't exist
  mkdir -p .speck

  # Write the plugin root path to .speck/plugin-path
  # PWD is the project root, same for both hook and commands
  echo "${CLAUDE_PLUGIN_ROOT}" > .speck/plugin-path
fi

# Uncomment for debugging:
# LOG_FILE="$HOME/.claude/speck-setup-env.log"
# mkdir -p "$HOME/.claude"
# {
#   echo "=== SPECK SETUP-ENV.SH DIAGNOSTIC ==="
#   echo "Timestamp: $(date)"
#   echo "Environment:"
#   echo "  - CLAUDE_ENV_FILE: ${CLAUDE_ENV_FILE:-NOT SET}"
#   echo "  - CLAUDE_PLUGIN_ROOT: ${CLAUDE_PLUGIN_ROOT:-NOT SET}"
#   echo "  - PWD: ${PWD}"
#   echo ""
#   if [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
#     echo "✓ Wrote plugin path to: .speck/plugin-path"
#     echo "  Value: ${CLAUDE_PLUGIN_ROOT}"
#   else
#     echo "✗ CLAUDE_PLUGIN_ROOT not set"
#   fi
#   echo "=== END DIAGNOSTIC ==="
# } >> "$LOG_FILE" 2>&1

exit 0
