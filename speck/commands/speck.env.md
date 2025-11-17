---
description: Check Speck plugin environment and configuration
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Environment Check

Perform a comprehensive environment check for the Speck plugin:

### 1. Check Environment Variables

```bash
echo "=== Environment Variables ==="
echo "CLAUDE_PLUGIN_ROOT: ${CLAUDE_PLUGIN_ROOT:-NOT SET}"
echo "SPECK_PLUGIN_ROOT: ${SPECK_PLUGIN_ROOT:-NOT SET}"
echo ""
```

### 2. Check Plugin Path File (Workaround for CLAUDE_ENV_FILE limitation)

```bash
echo "=== Plugin Path File ==="
PLUGIN_PATH_FILE=".speck/plugin-path"
if [ -f "$PLUGIN_PATH_FILE" ]; then
  echo "✓ File exists: $PLUGIN_PATH_FILE"
  echo "Contents:"
  cat "$PLUGIN_PATH_FILE"
else
  echo "✗ File not found: $PLUGIN_PATH_FILE"
  echo "  (This is normal in standalone mode)"
fi
echo ""
```

### 3. Check SessionStart Hook Log

```bash
echo "=== SessionStart Hook Log ==="
LOG_FILE="$HOME/.claude/speck-setup-env.log"
if [ -f "$LOG_FILE" ]; then
  echo "✓ Log file exists: $LOG_FILE"
  echo "Latest entry:"
  tail -40 "$LOG_FILE"
else
  echo "✗ Log file not found: $LOG_FILE"
  echo "  Hook may not have run or plugin not installed"
fi
echo ""
```

### 4. Determine Effective Plugin Root

```bash
echo "=== Effective Plugin Root ==="
# Derive plugin root using the same logic as commands should use
if [ -n "$SPECK_PLUGIN_ROOT" ]; then
  EFFECTIVE_ROOT="$SPECK_PLUGIN_ROOT"
  echo "✓ Using SPECK_PLUGIN_ROOT environment variable"
elif [ -f ".speck/plugin-path" ]; then
  EFFECTIVE_ROOT=$(cat .speck/plugin-path)
  echo "✓ Loaded from .speck/plugin-path"
elif [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
  EFFECTIVE_ROOT="${CLAUDE_PLUGIN_ROOT}"
  echo "✓ Derived from CLAUDE_PLUGIN_ROOT"
else
  EFFECTIVE_ROOT=".speck"
  echo "✓ Using default .speck (standalone mode)"
fi

echo "Effective root: $EFFECTIVE_ROOT"
echo ""
```

### 5. Check Bun Installation

```bash
echo "=== Bun Runtime ==="
if command -v bun &> /dev/null; then
  echo "✓ Bun is installed"
  bun --version
else
  echo "✗ Bun not found in PATH"
fi
echo ""
```

### 6. Test Script Execution

```bash
echo "=== Testing Script Access ==="
CHECK_SCRIPT="${EFFECTIVE_ROOT}/scripts/check-prerequisites.ts"
if [ -f "$CHECK_SCRIPT" ]; then
  echo "✓ Found: $CHECK_SCRIPT"
  echo "Running check-prerequisites..."
  bun run "$CHECK_SCRIPT" --json 2>&1 | head -20
else
  echo "✗ Not found: $CHECK_SCRIPT"
fi
echo ""
```

## Summary

After running all checks, provide a summary:
- Whether the plugin is installed (CLAUDE_PLUGIN_ROOT set)
- Whether environment setup is working (SPECK_PLUGIN_ROOT available)
- Whether the SessionStart hook is executing
- Whether scripts are accessible
- Any issues detected and suggested fixes

## Context

$ARGUMENTS
