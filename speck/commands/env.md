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

### 2. Check Plugin Path File

```bash
echo "=== Plugin Path File ==="
PLUGIN_PATH_FILE="$HOME/.claude/speck-plugin-path"
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
if [ -d ".speck/scripts" ]; then
  EFFECTIVE_ROOT=".speck"
  echo "✓ Using local .speck/scripts (preferred)"
elif [ -n "$SPECK_PLUGIN_ROOT" ]; then
  EFFECTIVE_ROOT="$SPECK_PLUGIN_ROOT"
  echo "✓ Using SPECK_PLUGIN_ROOT environment variable"
elif [ -f "$HOME/.claude/speck-plugin-path" ]; then
  EFFECTIVE_ROOT=$(cat "$HOME/.claude/speck-plugin-path")
  echo "✓ Loaded from $HOME/.claude/speck-plugin-path"
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

### 7. Check Multi-Repo Configuration

```bash
echo "=== Multi-Repo Configuration ==="
# Detect speck root and mode
bun -e '
import { detectSpeckRoot } from "'${EFFECTIVE_ROOT}'/scripts/common/paths.ts";
import fs from "node:fs/promises";
import path from "node:path";

try {
  const config = await detectSpeckRoot();

  if (config.mode === "single-repo") {
    console.log("Mode: Single-repo");
    console.log("  Repo Root:", config.repoRoot);
    console.log("  Specs Directory:", config.specsDir);
    console.log("");
    console.log("To enable multi-repo mode:");
    console.log("  /speck:link <path-to-speck-root>");
  } else {
    console.log("Mode: Multi-repo (enabled)");
    console.log("  Speck Root:", config.speckRoot);
    console.log("  Repo Root:", config.repoRoot);
    console.log("  Specs Directory:", config.specsDir);
    console.log("");

    // Show symlink details
    const symlinkPath = path.join(config.repoRoot, ".speck", "root");
    try {
      const target = await fs.readlink(symlinkPath);
      console.log("Linked Configuration:");
      console.log("  .speck/root →", target);
    } catch (e) {
      console.log("Warning: Could not read symlink");
    }
    console.log("");
    console.log("Shared:");
    console.log("  - Specs (spec.md) are stored at speck root");
    console.log("  - Contracts (contracts/) are stored at speck root");
    console.log("Local to this repo:");
    console.log("  - Plans (plan.md) use this repo'\''s constitution");
    console.log("  - Tasks (tasks.md) are repo-specific");
    console.log("  - Constitution (.speck/constitution.md) is repo-specific");
  }
} catch (error) {
  console.error("Error detecting speck configuration:", error.message);
}
'
echo ""
```

### 8. Branch Stack Status (US6, US2 for Multi-Repo)

**Multi-Repo Context (Feature 009):**
- When run from multi-repo root: Shows aggregate status across root + all child repos
- When run from child repo: Shows local branch stack with parent spec reference
- Output automatically groups branches by repository for clarity

```bash
echo "=== Branch Stack Status ==="
# T072-T081: Check for stacked PR mode and display branch stack
# T033-T034: Multi-repo aggregate view when in root context
bun -e '
import { readBranches } from "'${EFFECTIVE_ROOT}'/scripts/common/branch-mapper.ts";
import { getCurrentBranch } from "'${EFFECTIVE_ROOT}'/scripts/common/git-operations.ts";
import { detectSpeckRoot } from "'${EFFECTIVE_ROOT}'/scripts/common/paths.ts";
import path from "node:path";
import fs from "node:fs/promises";

try {
  const config = await detectSpeckRoot();
  const repoRoot = config.repoRoot;
  const branchesPath = path.join(repoRoot, ".speck", "branches.json");

  // T073: Check if branches.json exists
  try {
    await fs.access(branchesPath);
  } catch {
    // T074: File absent - stacked mode not enabled
    console.log("✓ Stacked PR mode: Not enabled");
    console.log("");
    console.log("To enable stacked PRs:");
    console.log("  /speck:branch create <branch-name> --base <base-branch>");
    console.log("");
    return;
  }

  // T075: File present - load branches.json
  const mapping = await readBranches(repoRoot);

  if (mapping.branches.length === 0) {
    console.log("✓ Stacked PR mode: Enabled (no branches yet)");
    console.log("");
    return;
  }

  console.log("✓ Stacked PR mode: Enabled");
  console.log("");

  // T076: Get current branch
  const currentBranch = await getCurrentBranch(repoRoot);

  // T077: Group branches by specId
  const specIds = Object.keys(mapping.specIndex);

  // T081: Calculate warnings count (simplified - just count active branches)
  const warningsCount = mapping.branches.filter(b => b.status === "active" && b.pr === null).length;

  // Display stack for each spec
  for (const specId of specIds) {
    const branchNames = mapping.specIndex[specId] || [];
    const branches = branchNames.map(name =>
      mapping.branches.find(b => b.name === name)
    ).filter(Boolean);

    console.log(`Spec: ${specId}`);
    console.log("Branch Stack:");

    // T078: Build dependency tree for each spec
    // Find root branches (based on main/master or non-stacked branch)
    const rootBranches = branches.filter(b =>
      !branchNames.includes(b.baseBranch)
    );

    // T079: Display tree visualization with markers
    function displayTree(branchName, indent = "  ", isLast = true) {
      const branch = branches.find(b => b.name === branchName);
      if (!branch) return;

      const marker = isLast ? "└─" : "├─";
      const isCurrent = branchName === currentBranch;

      // T080: Highlight current branch with "(current)" marker
      let display = `${indent}${marker} ${branchName}`;

      // Add status indicators
      if (branch.pr) {
        display += ` (${branch.status}, PR #${branch.pr})`;
      } else if (branch.status !== "active") {
        display += ` (${branch.status})`;
      }

      if (isCurrent) {
        display += " (current)";
      }

      console.log(display);

      // Find children
      const children = branches.filter(b => b.baseBranch === branchName);
      children.forEach((child, idx) => {
        const childIndent = indent + (isLast ? "  " : "│ ");
        displayTree(child.name, childIndent, idx === children.length - 1);
      });
    }

    // Display from base branch
    rootBranches.forEach((root, idx) => {
      console.log(`  ${root.baseBranch}`);
      displayTree(root.name, "  ", idx === rootBranches.length - 1);
    });

    console.log("");
  }

  // T082: Display warning summary with hint
  if (warningsCount > 0) {
    console.log(`⚠ ${warningsCount} branch(es) may need attention`);
    console.log("Run /speck:branch status for details");
  }

} catch (error) {
  console.error("Error checking branch stack:", error.message);
}
'
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
