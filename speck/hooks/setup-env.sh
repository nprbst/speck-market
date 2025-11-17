#!/usr/bin/env bash
# Speck Plugin Environment Setup Hook
# Runs on SessionStart to write plugin path to $HOME/.claude/speck-plugin-path

# If CLAUDE_PLUGIN_ROOT is available and $HOME/.claude exists, write it to $HOME/.claude/speck-plugin-path
if [ -n "$CLAUDE_PLUGIN_ROOT" ] && [ -d "$HOME/.claude" ]; then
  # Write the plugin root path to $HOME/.claude/speck-plugin-path
  echo "${CLAUDE_PLUGIN_ROOT}" > "$HOME/.claude/speck-plugin-path"
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
