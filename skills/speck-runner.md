---
name: speck-runner
description: Execute Speck workflow scripts with automatic context detection for plugin or standalone environments
parameters:
  type: object
  properties:
    script-name:
      type: string
      enum:
        - create-new-feature
        - setup-plan
        - check-prerequisites
        - update-agent-context
        - generate-tasks
        - analyze-consistency
      description: Name of the Speck script to execute (without .ts extension)
    args:
      type: array
      items:
        type: string
      description: Additional arguments to pass to the script (optional)
  required:
    - script-name
  additionalProperties: false
---

# Speck Runner Skill

This skill executes Speck workflow scripts with automatic context detection for plugin or standalone environments.

## Usage

Execute a Speck script by providing the script name:

```
/skill speck-runner {"script-name": "check-prerequisites"}
```

With additional arguments:

```
/skill speck-runner {"script-name": "check-prerequisites", "args": ["--json", "--require-tasks"]}
```

## Context Detection

The skill automatically detects whether Speck is running as:
1. **Plugin context**: Installed via Claude Code plugin system (checks `CLAUDE_PLUGIN_ROOT` environment variable)
2. **Standalone context**: Cloned repository or direct installation

## Script Path Resolution

Based on the detected context:

- **Plugin context**: Scripts are located at `$CLAUDE_PLUGIN_ROOT/.speck/scripts/`
- **Standalone context**: Scripts are located at `.speck/scripts/` (relative to current working directory)

## Execution

The skill uses Bun runtime to execute the specified script:

1. **Validate script-name parameter** against the allowed enum values
2. **Detect execution context** by checking `CLAUDE_PLUGIN_ROOT` environment variable
3. **Resolve script path** based on context (plugin or standalone)
4. **Execute script** using `Bun.spawn()` with resolved path and arguments
5. **Return output** (stdout/stderr) to the caller

## Available Scripts

- `create-new-feature`: Initialize a new feature specification
- `setup-plan`: Set up planning environment for a feature
- `check-prerequisites`: Verify prerequisites for a feature workflow
- `update-agent-context`: Update agent context with latest information
- `generate-tasks`: Generate implementation tasks from a plan
- `analyze-consistency`: Analyze consistency across specification artifacts

## Error Handling

- Invalid script names return validation error
- Missing script files return "script not found" error
- Script execution failures return stderr output with exit code

## Implementation

When you invoke this skill with parameters, you should:

1. Parse and validate the `script-name` parameter against the enum
2. Check if `CLAUDE_PLUGIN_ROOT` environment variable is set to determine context
3. Construct the script path:
   - Plugin: `${CLAUDE_PLUGIN_ROOT}/.speck/scripts/${script-name}.ts`
   - Standalone: `.speck/scripts/${script-name}.ts`
4. Execute using Bash tool: `bun run <script-path> <args>`
5. Return the output to the user

## Example Invocations

**Check prerequisites in plugin context:**
```typescript
// Detects CLAUDE_PLUGIN_ROOT=/home/user/.claude/plugins/speck
// Executes: bun run /home/user/.claude/plugins/speck/.speck/scripts/check-prerequisites.ts --json
```

**Check prerequisites in standalone context:**
```typescript
// CLAUDE_PLUGIN_ROOT not set
// Executes: bun run .speck/scripts/check-prerequisites.ts --json
```
