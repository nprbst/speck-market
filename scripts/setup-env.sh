#!/usr/bin/env bash
# Speck Plugin Environment Setup Hook
# Runs on SessionStart to configure SPECK_PLUGIN_ROOT environment variable

# Diagnostic logging to stderr
{
  echo "=== SPECK SETUP-ENV.SH DIAGNOSTIC ==="
  echo "Timestamp: $(date)"
  echo "Environment:"
  echo "  - CLAUDE_ENV_FILE: ${CLAUDE_ENV_FILE:-NOT SET}"
  echo "  - CLAUDE_PLUGIN_ROOT: ${CLAUDE_PLUGIN_ROOT:-NOT SET}"
  echo "  - PWD: ${PWD}"
  echo "  - Script location: $0"
} >&2

# Check if CLAUDE_ENV_FILE is set (Claude Code provides this)
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "  - CLAUDE_ENV_FILE is set" >&2

  # Check if CLAUDE_PLUGIN_ROOT is set (indicates running from installed plugin)
  if [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
    echo "  - CLAUDE_PLUGIN_ROOT is set" >&2
    echo "  - Writing to: $CLAUDE_ENV_FILE" >&2

    # Set SPECK_PLUGIN_ROOT to point to .speck directory within plugin
    echo "export SPECK_PLUGIN_ROOT=\"${CLAUDE_PLUGIN_ROOT}/.speck\"" >> "$CLAUDE_ENV_FILE"

    echo "  - Successfully wrote SPECK_PLUGIN_ROOT" >&2
    echo "  - Value: ${CLAUDE_PLUGIN_ROOT}/.speck" >&2
  else
    echo "  - WARNING: CLAUDE_PLUGIN_ROOT not set" >&2
  fi
  echo "=== END DIAGNOSTIC ===" >&2
  exit 0
fi

# If CLAUDE_ENV_FILE is not set, nothing to do
echo "  - ERROR: CLAUDE_ENV_FILE not set" >&2
echo "=== END DIAGNOSTIC ===" >&2
exit 0
