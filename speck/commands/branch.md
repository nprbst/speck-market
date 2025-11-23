---
description: Manage stacked PR branches with dependency tracking
---

# Stacked Branch Management

Manage stacked PR branches with explicit dependency tracking for multi-PR workflows.

## Usage

```bash
/speck:branch create <name> [--base <base-branch>] [--spec <spec-id>]
/speck:branch list [--all]
/speck:branch status
/speck:branch update <name> [--status <status>] [--pr <number>] [--base <branch>]
/speck:branch delete <name> [--force]
/speck:branch import [--pattern <pattern>]
```

## Commands

### create - Create a new stacked branch

Creates a new branch in the stack with explicit dependency tracking.

**Arguments:**
- `<name>` - Branch name (freeform, any valid git ref name)
- `--base <branch>` - Base branch to stack on (optional, defaults to current branch)
- `--spec <spec-id>` - Spec ID to link to (optional, auto-detected)
- `--no-worktree` - Skip worktree creation even if enabled in config (worktree integration, feature 012)
- `--no-ide` - Skip IDE launch during worktree creation (worktree integration, feature 012)
- `--no-deps` - Skip dependency installation during worktree creation (worktree integration, feature 012)
- `--reuse-worktree` - Reuse existing worktree directory if present (worktree integration, feature 012)

**Examples:**
```bash
# On branch 008-stacked-pr-support, create first stacked branch
/speck:branch create username/db-layer

# On branch username/db-layer, create next branch in stack
/speck:branch create username/api-endpoints

# Explicitly specify base (e.g., to branch from feature branch instead of current)
/speck:branch create username/ui-layer --base 008-stacked-pr-support
```

### list - View branch stacks

Shows all branches for the current spec or across all specs.

**Examples:**
```bash
/speck:branch list           # Current spec only
/speck:branch list --all     # All specs
```

### status - Check stack health

Shows warnings for branches needing attention (merged, stale, rebase needed).

**Example:**
```bash
/speck:branch status
```

### update - Update branch metadata

Updates branch status, PR number, or base branch.

**Examples:**
```bash
/speck:branch update username/db-layer --status submitted --pr 42
/speck:branch update username/api --base main
```

### delete - Remove branch from metadata

Removes branch from branches.json (does not delete git branch).

**Examples:**
```bash
/speck:branch delete username/old-feature
/speck:branch delete username/db-layer --force
```

### import - Import existing branches

Imports existing git branches into stacked mode with interactive spec mapping.

**Arguments:**
- `--pattern <pattern>` - Filter branches by pattern (optional, e.g., 'username/*')

**Examples:**
```bash
/speck:branch import --pattern 'username/*'
/speck:branch import
```

**How it works:**
1. Script lists all git branches (filtered by pattern if provided)
2. For each branch, infers base branch from git upstream
3. Prompts you to map each branch to a spec (via agent interaction)
4. Creates branch entries in branches.json with inferred metadata

## What This Does

1. Creates/manages `.speck/branches.json` for branch-to-spec mapping
2. Enables freeform branch naming (no NNN-pattern required)
3. Tracks dependency chains (which branch stacks on which)
4. Detects circular dependencies automatically
5. Works alongside Graphite, GitHub Stack, or manual git

## Multi-Repo Support (Feature 009)

In multi-repo contexts, branch operations work independently per repository:

**Child Repo Behavior:**
- Each child repo maintains its own `.speck/branches.json` file
- Branch stacks are isolated - operations in one child don't affect others
- PR titles auto-prefixed with `[repo-name]` for clarity
- Parent spec ID automatically detected from root repo's current branch

**Aggregate Views with --all:**
```bash
# From root or any child repo - shows ALL branches across ALL repos
/speck:branch list --all
/speck:branch status --all
```

**Cross-Repo Validation:**
- Base branches must exist in the same repository (cross-repo dependencies prevented)
- Clear error messages suggest alternatives (merge-first, contracts, manual coordination)

**Examples:**
```bash
# In child repo backend-service
/speck:branch create nprbst/auth-db --base main
# Creates branch tracked in backend-service/.speck/branches.json with parentSpecId

# View aggregate across all child repos from root
cd /path/to/speck-root
/speck:branch list --all
# Output groups branches by repository
```

## Backwards Compatibility

- If `.speck/branches.json` doesn't exist, traditional single-branch workflow continues
- Creating first stacked branch automatically initializes the file
- Existing specs can mix traditional and stacked branches

## Implementation

**Agent Logic for PR Creation (T031k-T031m)**:

When executing `/speck:branch create`, the script may detect a PR opportunity and exit with code 2. You must detect this and interact with the user to offer PR creation.

Execute the command and handle the interrupt-resume pattern:

```bash
# Determine plugin root (prefer local .speck/scripts, fallback to plugin path)
if [ -d ".speck/scripts" ]; then
  PLUGIN_ROOT=".speck"
else
  PLUGIN_ROOT=$(cat "$HOME/.claude/speck-plugin-path" 2>/dev/null || echo ".speck")
fi

# Execute branch management script, capturing stderr for PR suggestions
STDERR_FILE=$(mktemp)
bun run "$PLUGIN_ROOT/scripts/branch-command.ts" {{args}} 2>"$STDERR_FILE"
EXIT_CODE=$?

# Read stderr for PR suggestion JSON
STDERR_CONTENT=$(cat "$STDERR_FILE")
rm -f "$STDERR_FILE"

# Check for PR suggestion JSON in stderr
PR_SUGGESTION=$(echo "$STDERR_CONTENT" | grep '^{.*"type":"pr-suggestion"' | head -1 || echo "")
```

After running the script, handle the exit code:

**If EXIT_CODE is 0**: Command succeeded. If this was a `create` command, proceed to worktree integration (see below).

**If EXIT_CODE is 1**: Command failed with an error.

**If EXIT_CODE is 2 and PR_SUGGESTION contains JSON**: A PR opportunity was detected (create command only). Parse the JSON and prompt the user for PR creation.

**If EXIT_CODE is 3**: Import prompt needed (import command only). Parse JSON from stderr for branch-to-spec mapping.

### [SPECK-EXTENSION] Worktree Integration for `create` Command

**After successful branch creation (EXIT_CODE is 0 for create command)**, check worktree configuration and create worktree if enabled:

1. **Check worktree configuration**: Load `.speck/config.json` and check if `worktree.enabled` is true
2. **Parse the created branch name**: Extract branch name from command output or arguments
3. **If worktree integration is enabled**:
   - Run: `bun .speck/scripts/worktree/create.ts --branch "$BRANCH_NAME" --repo-path "$(pwd)"`
     - Pass through `--no-ide` flag if user provided it
     - Pass through `--no-deps` flag if user provided it
     - Pass through `--reuse-worktree` flag if user provided it
   - If creation succeeds:
     - Report: "✓ Created worktree at [path]"
     - If IDE auto-launch is enabled, report: "✓ Launched [IDE name]"
   - If creation fails (non-fatal):
     - Report warning: "⚠ Worktree creation failed: [error]"
     - Continue (worktree is optional)
4. **If worktree integration is disabled**:
   - Skip worktree creation silently
   - Branch is checked out in main repository (standard Git workflow)
5. **Flag support** (override config):
   - If user passed `--no-worktree` flag: Skip worktree creation even if enabled in config
   - If user passed `--no-ide` flag: Pass `--no-ide` to worktree creation to skip IDE launch
   - If user passed `--no-deps` flag: Pass `--no-deps` to worktree creation to skip dependency installation
   - If user passed `--reuse-worktree` flag: Pass `--reuse-worktree` to worktree creation

## Agent Workflow for PR Suggestions (T031k-T031m)

When you detect exit code 2 with a PR suggestion JSON:

1. **Parse the JSON** from `$PR_SUGGESTION` (T031k):
   - Extract: `branch`, `suggestedTitle`, `suggestedDescription`, `suggestedBase`, `newBranch`

2. **Prompt the user** (T031k):
   Display the PR opportunity and ask if they want to create it:
   ```
   I detected a PR opportunity for branch '{branch}' before creating '{newBranch}'.

   Suggested PR:
   - Title: {suggestedTitle}
   - Base: {suggestedBase}
   - Description:
     {suggestedDescription}

   Would you like me to create this PR now?
   ```

3. **Handle user response**:

   **If user confirms YES** (T031l):
   - Re-invoke with PR creation flags (preserve original --base and --spec if present):
     ```bash
     /speck:branch create {newBranch} --create-pr --title "{suggestedTitle}" --description "{suggestedDescription}" --pr-base "{suggestedBase}" [original flags]
     ```

   **If user declines NO** (T031m):
   - Re-invoke with skip flag (preserve original --base and --spec if present):
     ```bash
     /speck:branch create {newBranch} --skip-pr-prompt [original flags]
     ```

## Agent Workflow for Import (T060-T067)

When executing `/speck:branch import`, the script may detect branches to import and exit with code 3. You must detect this and interact with the user to map branches to specs.

Check for exit code 3 after running the script:

- **If EXIT_CODE is 3**: Branches need spec mapping. Parse JSON from stderr.
- **If EXIT_CODE is 0**: Import completed successfully.

When you detect exit code 3:

1. **Parse the JSON** from stderr (T063):
   ```javascript
   {
     "type": "import-prompt",
     "branches": [
       {
         "name": "username/db-layer",
         "upstream": "origin/main",
         "inferredBase": "main"
       },
       {
         "name": "username/api-layer",
         "upstream": "origin/username/db-layer",
         "inferredBase": "username/db-layer"
       }
     ],
     "availableSpecs": ["007-multi-repo", "008-stacked-pr-support"]
   }
   ```

2. **Prompt the user** for each branch (T063-T064):
   ```
   I found {count} branches to import. For each branch, please specify which spec to link it to, or type 'skip' to skip:

   Branch: {branch.name}
   - Upstream: {branch.upstream}
   - Inferred base: {branch.inferredBase}

   Available specs:
   1. 007-multi-repo
   2. 008-stacked-pr-support

   Link to which spec? (Enter number or 'skip')
   ```

3. **Collect user responses** (T064):
   - Allow user to enter spec number, spec ID directly, or 'skip'
   - Build mappings array: `["username/db-layer:007-multi-repo", "username/api-layer:skip"]`

4. **Re-invoke with batch flag** (T066):
   ```bash
   /speck:branch import --batch username/db-layer:007-multi-repo username/api-layer:008-stacked-pr-support
   ```

## Example Agent Interactions

### Example 1: PR Creation

```
User: /speck:branch create username/api-layer

[Script detects commits on current branch and exits with code 2]

Agent: I detected a PR opportunity for branch 'username/db-layer' before creating 'username/api-layer'.

Suggested PR:
- Title: Add database layer
- Base: main
- Description:
  - Implement User model
  - Add database schema
  - Set up migrations

Would you like me to create this PR now?

User: Yes

Agent: [Re-runs] /speck:branch create username/api-layer --create-pr --title "Add database layer" --description "..." --pr-base "main"

Output:
Creating PR for 'username/db-layer'...
✓ Created PR #42 for 'username/db-layer'
✓ Created stacked branch 'username/api-layer'
...
```

### Example 2: Branch Import

```
User: /speck:branch import --pattern 'username/*'

[Script finds 2 branches to import and exits with code 3]

Agent: I found 2 branches to import. For each branch, please tell me which spec to link it to:

Branch 1: username/db-layer
- Upstream: origin/main
- Inferred base: main

Available specs:
1. 007-multi-repo
2. 008-stacked-pr-support

Which spec should this branch be linked to?

User: 007-multi-repo

Agent: Got it. Next branch:

Branch 2: username/api-layer
- Upstream: origin/username/db-layer
- Inferred base: username/db-layer

Available specs:
1. 007-multi-repo
2. 008-stacked-pr-support

Which spec should this branch be linked to?

User: 1

Agent: [Re-runs] /speck:branch import --batch username/db-layer:007-multi-repo username/api-layer:007-multi-repo

Output:
✓ Imported username/db-layer → 007-multi-repo
✓ Imported username/api-layer → 007-multi-repo

✓ Import complete:
  Imported: 2
  Skipped: 0
```
