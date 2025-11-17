---
description: Perform a non-destructive check of the plugin environment
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

1. Check if `CLAUDE_PLUGIN_ROOT` environment variable is set (run `echo $CLAUDE_PLUGIN_ROOT`)
2. Check if `SPECK_PLUGIN_ROOT` environment variable is set (run `echo $SPECK_PLUGIN_ROOT`)
3. Check if `bun` is installed

Run `bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/check-prerequisites.ts --json --require-tasks --include-tasks` once from repo root and parse JSON for FEATURE_DIR and AVAILABLE_DOCS. Derive absolute paths:

- SPEC = FEATURE_DIR/spec.md
- PLAN = FEATURE_DIR/plan.md
- TASKS = FEATURE_DIR/tasks.md

Report on what you find.

## Context

$ARGUMENTS
