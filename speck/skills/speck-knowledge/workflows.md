# Speck Advanced Workflows

Advanced features from features 007-012: Multi-repo support, stacked PRs, virtual commands, and worktree integration.

**Referenced from**: SKILL.md

---

## Table of Contents

1. [Multi-Repo Mode Detection](#multi-repo-mode-detection)
2. [Stacked PR Mode Detection](#stacked-pr-mode-detection)
3. [Virtual Command Architecture](#virtual-command-architecture)
4. [Worktree Mode Detection](#worktree-mode-detection)
5. [Hook Failures and Fallback Methods](#hook-failures-and-fallback-methods)

---

## Multi-Repo Mode Detection

When interpreting Speck artifacts, determine if the project is in multi-repo mode:

**Detection Method**:
- Check for `.speck/root` symlink in `.speck/` directory
- If symlink exists and points to parent directory → multi-repo child repo
- If no symlink → single-repo mode

**Child Repo Context**:
When in child repo:
- Specs MAY reference parent specs via `**Parent Spec**` field in spec.md metadata
- Feature numbers MUST be coordinated across all child repos (no duplicates)
- Constitution lives in root repo (`.speck/constitution.md`), child repos may have their own
- Plan and tasks artifacts (plan.md, tasks.md) are per-repo (not shared)

**Root Repo Context**:
- Contains shared `specs/` directory with feature specifications
- Child repos symlink via `.speck/root` pointing to root repo directory
- Manages spec.md files (shared across child repos)

**Symlink Structure**:
```bash
# Child repo structure
.speck/
  root -> ../../  # Points to shared specs root directory

# Resolves to shared specs
specs/ -> (via symlink resolution)
```

**User Query Examples**:
- "Is this a multi-repo setup?" → Check for `.speck/root` symlink
- "What's the parent spec?" → Read `**Parent Spec**` from spec.md metadata
- "Where's the constitution?" → Check local `.speck/constitution.md` or follow symlink to root

**Multi-Repo + Stacked PRs**:
When combining both modes:
- Each child repo MAY use stacked PRs independently
- Branch naming remains per-repo: `NNN-feature-name` or custom naming
- Feature numbers MUST still be unique across all child repos
- `.speck/branches.json` lives in each child repo (not shared)

---

## Stacked PR Mode Detection

Features MAY use stacked PR workflow where each user story or logical unit gets its own branch/PR:

**Detection Method**:
- Check for `.speck/branches.json` file in repository root
- Check for `**Workflow Mode**: stacked-pr` in plan.md metadata
- If present → feature uses stacked PRs

**Branch Metadata Structure** (`.speck/branches.json`):
```json
{
  "schemaVersion": "1.0.0",
  "branches": [
    {
      "branchName": "007-multi-repo",
      "baseBranch": "main",
      "specId": "007-multi-repo-monorepo-support",
      "prNumber": 123,
      "status": "active",
      "createdAt": "2025-11-18T10:00:00Z",
      "updatedAt": "2025-11-18T10:00:00Z"
    },
    {
      "branchName": "nprbst/db-layer",
      "baseBranch": "007-multi-repo",
      "specId": "007-multi-repo-monorepo-support",
      "status": "active",
      "createdAt": "2025-11-19T14:30:00Z",
      "updatedAt": "2025-11-19T14:30:00Z"
    }
  ],
  "specIndex": {
    "007-multi-repo-monorepo-support": ["007-multi-repo", "nprbst/db-layer"]
  }
}
```

**Branch Status Values**:
- `active`: Branch exists, work in progress
- `submitted`: PR created, under review
- `merged`: PR merged, branch may still exist
- `abandoned`: Branch/PR abandoned

**Naming Conventions**:
- Supports **freeform naming** (not limited to `NNN-feature-usX` pattern)
- Examples: `007-multi-repo`, `nprbst/db-layer`, `feature/authentication`
- Tool-agnostic: Works with Graphite, GitHub Stack, or manual git workflow

**Branch-Aware Task Generation**:
- Command: `/speck.tasks --branch <name> --stories <US1,US2>`
- Generates subset of tasks for specific branch
- Output: `tasks-<branch-name>.md` or `tasks.md` (if no --branch flag)
- Tasks filtered by user story labels matching `--stories` parameter

**User Query Examples**:
- "Which branches exist for this feature?" → Read `.speck/branches.json`, filter by `specId`
- "What's the dependency order?" → Parse `baseBranch` chain (e.g., main → 007-multi-repo → nprbst/db-layer)
- "Is this using stacked PRs?" → Check workflow mode in plan.md or presence of branches.json

**Interrupt-Resume PR Suggestion Pattern**:
When creating branches, `/speck.branch create` may exit with code 2 (suggestion pending):
1. Script outputs JSON to stderr: `{"type": "pr-suggestion", "branch": "...", "suggestedTitle": "...", ...}`
2. Claude Code agent prompts user: "Create PR now? (yes/no/skip)"
3. Re-invokes with `--create-pr` or `--skip-pr-prompt` based on user response
4. Allows workflow customization without blocking automation

---

## Virtual Command Architecture

Speck uses virtual commands for sub-100ms execution via Claude Code hooks:

**Virtual Command Pattern**:
- Commands appear as `/speck.*` slash commands in Claude Code
- Actual implementation in `.speck/scripts/*.ts` and hook handlers
- Hooks handle prerequisite checking and context pre-loading
- Example commands: `/speck.specify`, `/speck.plan`, `/speck.tasks`, `/speck.branch`

**Hook Types**:

1. **PreToolUse hook**: Runs when virtual command is invoked (before tool execution)
   - Intercepts commands matching pattern `speck-*` (e.g., `speck-env`, `speck-branch`)
   - Reads JSON from stdin: `{"tool_input": {"command": "speck-branch list"}}`
   - Routes to unified CLI handler (`speck.ts`)
   - Returns JSON to stdout with `permissionDecision: "allow"` and transformed command
   - Enables path-independent command execution

2. **PrePromptSubmit hook**: Runs on every user message (before slash command expansion)
   - Detects if user is in feature directory
   - Runs prerequisite checks automatically
   - Pre-loads context and injects into prompt as markdown comment
   - Enables sub-100ms command execution (prerequisites already satisfied)
   - Slash commands parse injected context directly (no manual `check-prerequisites`)

**Command Registry Pattern**:
Centralized registry maps command names to handlers:
```typescript
// .speck/scripts/commands/index.ts
export const registry: CommandRegistry = {
  "env": { handler: envHandler, description: "Check environment" },
  "branch": { handler: branchHandler, description: "Manage stacked branches" }
}
```

**Dual-Mode Execution**:
Commands work identically in two modes:
1. **Claude Code mode**: Invoked via hooks, JSON stdin/stdout
2. **CLI mode**: Invoked via `bun run .speck/scripts/<name>.ts`, terminal I/O

Detection logic:
```typescript
const isHookMode = args.includes('--hook') || !process.stdin.isTTY
```

**Performance Characteristics**:
- Hook routing: <100ms latency (SC-003 from feature 010)
- Prerequisite caching: 30% faster execution via PrePromptSubmit context injection
- No manual prerequisite checks needed in slash commands (pre-validated)

**When Explaining Commands**:
- Commands execute instantly because hooks pre-validate context
- No need for manual directory checking or path resolution
- Works in both Claude Code and direct CLI (`bun run`)

**User Query Examples**:
- "Why are commands so fast?" → Explain hook-based prerequisite checking and context injection
- "What's the virtual command pattern?" → Explain hooks + dual-mode execution
- "How do slash commands work?" → Explain PreToolUse routing and PrePromptSubmit context loading

---

## Worktree Mode Detection

Features MAY use Git worktrees for isolated parallel development:

**Detection Method**:
- Check for `.speck/config.json` with `worktree.enabled: true`
- Check for `.speck/worktrees/<branch-name>.json` metadata files
- Verify Git version supports worktrees (Git 2.5+)

**Worktree Configuration** (`.speck/config.json`):
```json
{
  "worktree": {
    "enabled": true,
    "autoLaunchIDE": true,
    "preferredIDE": "vscode",
    "installDependencies": true,
    "branchPrefix": "specs/"
  },
  "files": {
    "rules": [
      {"pattern": ".env*", "action": "copy"},
      {"pattern": "*.config.{js,ts}", "action": "copy"},
      {"pattern": "node_modules", "action": "symlink"},
      {"pattern": ".bun", "action": "symlink"}
    ]
  }
}
```

**Worktree Metadata** (`.speck/worktrees/<branch-name>.json`):
```json
{
  "branchName": "012-worktree-integration",
  "worktreePath": "../speck-012-worktree-integration",
  "createdAt": "2025-11-22T10:00:00Z",
  "status": "active"
}
```

**Worktree Naming Logic**:
Path calculation based on repository layout:
- If repo directory name = repo name: `<repo-name>-<branch-name>`
- If repo directory name = branch name: `<branch-name>`
- Example: Repo at `/projects/speck/`, branch `012-worktree` → worktree at `/projects/speck-012-worktree/`

**File Copy vs Symlink Rules**:
Configuration files copied (isolated per worktree):
- `.env*` files (environment variables)
- `*.config.{js,ts}` (build configs)

Dependencies symlinked (shared across worktrees):
- `node_modules/` (npm/yarn/pnpm packages)
- `.bun/` (Bun cache)

**Worktree Lifecycle**:

1. **Creation**: `/speck.specify` with worktree flags OR manual `git worktree add`
   - `--no-worktree`: Skip worktree creation
   - `--no-ide`: Skip IDE auto-launch
   - `--no-deps`: Skip dependency installation
   - `--reuse-worktree`: Reuse existing worktree if present

2. **Update**: Metadata tracks feature association in `.speck/worktrees/<branch>.json`

3. **Cleanup**: Worktree removal cleans up metadata
   - `speck worktree remove <branch>`: Remove worktree (with confirmation)
   - `speck worktree prune`: Cleanup stale worktree references

**IDE Auto-Launch**:
After worktree creation:
- Copies config files (`.env`, `*.config.js`)
- Symlinks dependencies (`node_modules`)
- Installs dependencies with progress indicator (if `installDependencies: true`)
- Launches IDE pointing to worktree path
- Supported IDEs: VSCode (`code`), Cursor (`cursor`), JetBrains (`idea`/`webstorm`)

**User Query Examples**:
- "Is this in a worktree?" → Check current directory path for worktree metadata or Git worktree list
- "What's the worktree config?" → Read `.speck/config.json` worktree section
- "Which worktrees exist?" → List `.speck/worktrees/*/metadata.json` files or `git worktree list`
- "How are files managed?" → Explain copy vs symlink rules from config.json

---

## Hook Failures and Fallback Methods

When VSCode Claude Extension hooks fail (known bug), slash commands won't receive prerequisite context automatically. This section explains how to troubleshoot and work around hook failures.

**Common Symptoms**:
- Missing `SPECK_PREREQ_CONTEXT` comment in slash command prompts
- Virtual commands fail with exit code 127 ("command not found")
- Slash commands ask you to run prerequisite checks manually

**Root Cause**:
VSCode Claude Extension has a bug that prevents PreToolUse and UserPromptSubmit hooks from executing for installed plugins. This breaks:
1. **UserPromptSubmit hook**: Prerequisite context not injected into prompts
2. **PreToolUse hook**: Virtual commands (`speck-*`) not intercepted

**Fallback Method 1: Virtual Commands**

If SPECK_PREREQ_CONTEXT is missing, try running the virtual command:

```bash
speck-check-prerequisites --json [options]
speck-setup-plan --json
```

These virtual commands work when PreToolUse hook is functional.

**Fallback Method 2: Direct Script Execution**

If virtual commands fail with exit code 127, run scripts directly from the installed plugin:

```bash
bun ~/.claude/plugins/marketplaces/speck-market/speck/scripts/<script-name>.ts --json [options]
```

**Available Scripts**:
- `check-prerequisites.ts` - Validate feature directory and generate context
- `setup-plan.ts` - Initialize planning workflow
- `create-new-feature.ts` - Create new feature specification
- `update-agent-context.ts` - Update agent context files

**Script Options by Command**:

| Slash Command | Script | Required Options |
|---------------|--------|------------------|
| `/speck.implement` | `check-prerequisites.ts` | `--json --require-tasks --include-tasks` |
| `/speck.plan` | `setup-plan.ts` | `--json` |
| `/speck.tasks` | `check-prerequisites.ts` | `--json` |
| `/speck.analyze` | `check-prerequisites.ts` | `--json --require-tasks --include-tasks` |
| `/speck.clarify` | `check-prerequisites.ts` | `--json --paths-only` |
| `/speck.checklist` | `check-prerequisites.ts` | `--json` |
| `/speck.taskstoissues` | `check-prerequisites.ts` | `--json --require-tasks --include-tasks` |

**Multi-Repo Context with Fallbacks**:

When running fallback commands in multi-repo mode, the scripts automatically detect:
- Mode detection via `.speck/root` symlink
- Shared specs location (root repo `specs/`)
- Local implementation artifacts (child repo `specs/`)

**Example: Multi-Repo Fallback**

```bash
# In child repo directory
cd /path/to/child-repo

# Run prerequisite check
bun ~/.claude/plugins/marketplaces/speck-market/speck/scripts/check-prerequisites.ts --json

# Output includes both shared and local paths:
{
  "MODE": "multi-repo",
  "FEATURE_DIR": "/path/to/root-repo/specs/007-feature",
  "IMPL_PLAN": "/path/to/child-repo/specs/007-feature/plan.md",
  "TASKS": "/path/to/child-repo/specs/007-feature/tasks.md",
  "REPO_ROOT": "/path/to/child-repo",
  "AVAILABLE_DOCS": [
    "../../../root-repo/specs/007-feature/spec.md",
    "specs/007-feature/plan.md",
    "specs/007-feature/tasks.md"
  ]
}
```

**Interpreting Fallback Output**:

When slash commands show fallback instructions:
1. Copy the exact `bun` command shown
2. Run it in your terminal from the repository root
3. Parse the JSON output to extract needed paths
4. Provide the parsed information to the slash command

**User Query Examples**:
- "Why isn't SPECK_PREREQ_CONTEXT showing up?" → Explain VSCode hook bug, suggest fallback method
- "How do I run prerequisite checks manually?" → Show `bun ~/.claude/plugins/.../check-prerequisites.ts --json`
- "Where are the scripts in the installed plugin?" → Explain `~/.claude/plugins/marketplaces/speck-market/speck/scripts/`
- "Do fallbacks work in multi-repo mode?" → Explain automatic mode detection via `.speck/root` symlink
