---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts.
tools: ['github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Script Path Resolution

**IMPORTANT**: Detect execution context before running any scripts:

1. Check if `CLAUDE_PLUGIN_ROOT` environment variable is set (run `echo $CLAUDE_PLUGIN_ROOT`)
2. Set paths based on context:
   - **Plugin context** (if CLAUDE_PLUGIN_ROOT is set): Use `$CLAUDE_PLUGIN_ROOT/.speck/scripts/` for scripts
   - **Standalone context** (if CLAUDE_PLUGIN_ROOT is empty): Use `.speck/scripts/` for scripts

Throughout this command, when you see `.speck/scripts/scriptname.ts`, replace it with the resolved path from above.

## Outline

1. Run `bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/check-prerequisites.ts --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.
1. Get the Git remote by running:

```bash
echo "DEBUG: $(env | grep PLUGIN)"
git config --get remote.origin.url
```

**ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL**

1. For each task in the list, use the GitHub MCP server to create a new issue in the repository that is representative of the Git remote.

**UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL**
