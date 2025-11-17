#!/usr/bin/env bash
# Speck Plugin Environment Setup Hook
# Runs on SessionStart to configure SPECK_PLUGIN_ROOT environment variable

# Log file for troubleshooting
LOG_FILE="$HOME/.claude/speck-setup-env.log"

# Ensure log directory exists
mkdir -p "$HOME/.claude"

# Write diagnostic information to log file
{
  echo "=== SPECK SETUP-ENV.SH DIAGNOSTIC ==="
  echo "Timestamp: $(date)"
  echo "Environment:"
  echo "  - CLAUDE_ENV_FILE: ${CLAUDE_ENV_FILE:-NOT SET}"
  echo "  - CLAUDE_PLUGIN_ROOT: ${CLAUDE_PLUGIN_ROOT:-NOT SET}"
  echo "  - PWD: ${PWD}"
  echo "  - Script location: $0"
  echo ""

  # Check if CLAUDE_PLUGIN_ROOT is available (we always have this in plugin context)
  if [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
    echo "✓ CLAUDE_PLUGIN_ROOT is set"
    echo "  Value: $CLAUDE_PLUGIN_ROOT"
    echo ""

    # Try to set SPECK_PLUGIN_ROOT using CLAUDE_ENV_FILE if available
    if [ -n "$CLAUDE_ENV_FILE" ]; then
      echo "✓ CLAUDE_ENV_FILE is set"
      echo "  Location: $CLAUDE_ENV_FILE"
      echo "  File exists before write: $([ -f "$CLAUDE_ENV_FILE" ] && echo 'YES' || echo 'NO')"
      echo ""
      echo "Writing SPECK_PLUGIN_ROOT to env file..."

      # Set SPECK_PLUGIN_ROOT to plugin root (which contains .speck/)
      # Note: CLAUDE_PLUGIN_ROOT points to dist/plugin/speck/ which contains .speck/
      echo "export SPECK_PLUGIN_ROOT=\"${CLAUDE_PLUGIN_ROOT}\"" >> "$CLAUDE_ENV_FILE"

      echo "✓ Successfully wrote SPECK_PLUGIN_ROOT via CLAUDE_ENV_FILE"
      echo "  Value: ${CLAUDE_PLUGIN_ROOT}"
      echo ""
      echo "Env file contents after write:"
      cat "$CLAUDE_ENV_FILE" 2>&1
    else
      echo "⚠ CLAUDE_ENV_FILE not available in plugin SessionStart hook"
      echo "  This is a known limitation - env vars cannot be persisted from plugin hooks"
      echo ""
      echo "SOLUTION: Writing plugin path to .speck/plugin-path in project root"

      # Create .speck directory if it doesn't exist
      mkdir -p .speck

      # Write the plugin root path to .speck/plugin-path
      # PWD is the project root, same for both hook and commands
      # Note: CLAUDE_PLUGIN_ROOT points to the speck/ subdirectory which contains .speck/
      echo "${CLAUDE_PLUGIN_ROOT}" > .speck/plugin-path

      echo "✓ Wrote plugin path to: .speck/plugin-path"
      echo "  PWD: ${PWD}"
      echo "  Plugin root: ${CLAUDE_PLUGIN_ROOT}"
      echo "  Commands can read with: \$(cat .speck/plugin-path 2>/dev/null || echo \".speck\")"
    fi
  else
    echo "✗ WARNING: CLAUDE_PLUGIN_ROOT not set"
    echo "  Hook is running but plugin context unavailable"
  fi

  echo ""
  echo "=== END DIAGNOSTIC ==="
  echo ""
} >> "$LOG_FILE" 2>&1

# Exit successfully (hook should not fail even if env vars not set)
exit 0
