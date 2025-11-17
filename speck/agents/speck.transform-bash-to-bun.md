# Agent: Transform Bash to Bun TypeScript

**Purpose**: Analyze bash scripts from upstream spec-kit releases and generate
functionally equivalent Bun TypeScript implementations that maintain 100% CLI
interface compatibility.

**Invoked by**: `/speck.transform-upstream` command

**Input**: Path to bash script(s) in `upstream/<version>/scripts/bash/`
directory

**Output**: Bun TypeScript implementation(s) in `.speck/scripts/` directory with
transformation rationale

---

## Optimization: Diff-Aware Processing

**IMPORTANT**: The invoking command will provide context about which bash
scripts have CHANGED since the previous upstream version.

### Context Variables

When invoked, you will receive:

- **UPSTREAM_VERSION**: The version being transformed (e.g., `v0.0.84`)
- **PREVIOUS_VERSION**: The last successfully transformed version (e.g.,
  `v0.0.83`), or `"none"` for first transformation
- **CHANGED_BASH_SCRIPTS**: List of ONLY the bash scripts that are new or
  modified

### Processing Rules

1. **If PREVIOUS_VERSION is "none"**: Transform ALL bash scripts (first-time
   transformation)

2. **If PREVIOUS_VERSION exists**:
   - **TRUST the CHANGED_BASH_SCRIPTS list** - do NOT re-verify or second-guess
     whether files changed
   - **ONLY process scripts in CHANGED_BASH_SCRIPTS list**
   - **Skip all other scripts entirely** - they're already transformed and
     unchanged
   - Report skipped scripts in the JSON output

3. **For each changed script**:
   - **ALWAYS read the upstream bash script** to understand what changed
   - Check if a `.ts` file already exists in `.speck/scripts/`
   - If exists: **UPDATE** the existing file (preserve [SPECK-EXTENSION]
     markers)
   - If new: **CREATE** a new `.ts` file
   - **CRITICAL**: Even if the TypeScript implementation already handles the
     change functionally (e.g., already immune to a bash security fix), you
     MUST update the documentation header to track the upstream version and
     explain the equivalence

---

## Transformation Strategy

Follow this priority order when choosing transformation approach:

### 1. Pure TypeScript (PREFERRED)

Use native TypeScript/JavaScript for:

- File I/O operations (`Bun.file()`, `Bun.write()`)
- JSON parsing and generation (`JSON.parse()`, `JSON.stringify()`)
- String manipulation (native JS string methods)
- Path operations (`import path from "node:path"`)
- Environment variable access (`process.env`)
- CLI argument parsing (manual or simple library)

**Example**:

```bash
# Bash
VERSION=$(cat version.json | jq -r '.version')
```

```typescript
// TypeScript
const versionData = await Bun.file("version.json").json();
const version = versionData.version;
```

### 2. Bun Shell API (for shell-like constructs)

Use `import { $ } from "bun"` for:

- Pipelines (`|`)
- Command chaining (`&&`, `||`)
- Output redirection
- Process substitution
- When bash script heavily uses shell features

**Example**:

```bash
# Bash
find . -name "*.md" | wc -l
```

```typescript
// Bun Shell
import { $ } from "bun";
const count = await $`find . -name "*.md" | wc -l`.text();
```

### 3. Bun.spawn() (LAST RESORT)

Use `Bun.spawn()` only for:

- Complex bash-specific constructs that can't be reimplemented
- Legacy bash functions with complex state
- When bash script sources other bash scripts with circular dependencies

**Example**:

```typescript
// Bun.spawn()
const proc = Bun.spawn(["bash", "-c", "source .env && complex_bash_function"], {
  cwd: "/path",
  env: process.env,
  stdout: "pipe",
});
const output = await new Response(proc.stdout).text();
```

---

## Breaking Change Detection

**CRITICAL**: Before transforming, analyze the upstream bash script for breaking changes compared to the existing TypeScript implementation (if one exists).

### Breaking Changes Defined

A **breaking change** is any modification that would cause existing users or integrations to fail:

- **Removed CLI flags**: Flag present in old version but missing in new version
- **Renamed CLI flags**: Flag name changed (e.g., `--json` → `--json-output`)
- **Changed exit code semantics**: Exit code values or meanings altered (e.g., 1 was "user error" now means "system error")
- **Altered JSON output schema**: JSON structure changed (keys added/removed/renamed, value types changed)
- **Incompatible behavioral changes**: Function that previously succeeded now fails, or vice versa

### Detection Workflow

**For each bash script being transformed**:

1. **Check for existing TypeScript file**: If `.speck/scripts/<name>.ts` exists, this is an UPDATE
2. **If UPDATE**: Compare the OLD upstream bash (from PREVIOUS_VERSION) with NEW upstream bash (from UPSTREAM_VERSION)
   - If PREVIOUS_VERSION is "none", skip breaking change detection (first transformation)
   - Read both versions and analyze differences
3. **Detect breaking changes**:
   - **CLI flags**: Parse both versions for flag definitions (e.g., `--json`, `--help`, `--version`)
     - Missing flags = breaking
     - New required positional arguments = breaking
   - **Exit codes**: Analyze exit code usage patterns
     - Changed exit code for same error condition = breaking
   - **JSON output**: If `--json` flag exists, compare JSON structure
     - Missing keys in new version = breaking
     - Changed key names = breaking
     - Changed value types (string → number) = breaking
   - **Behavioral changes**: Look for fundamental logic changes
     - Function removed or made unavailable = breaking

4. **If breaking changes detected**:
   - **PAUSE transformation immediately**
   - **Generate conflict analysis report** with:
     - File name and path
     - List of specific breaking changes detected
     - Old vs. new comparison for each breaking change
     - Impact assessment (which users/integrations affected)
   - **Present options to user**:
     - **Option 1**: Skip this script (keep existing `.speck/scripts/<name>.ts` unchanged)
     - **Option 2**: Attempt best-effort transformation with warnings (update code but document breaking changes)
     - **Option 3**: Abort entire transformation (exit without changes)
   - **Wait for user decision** before proceeding

### Example Breaking Change Detection

```markdown
## ⚠️ BREAKING CHANGES DETECTED

**Script**: `check-prerequisites.sh` → `check-prerequisites.ts`
**Upstream Version**: v0.0.83 → v0.0.84

**Breaking Changes Found**:

1. **Removed CLI Flag**: `--paths-only`
   - **Old**: `--paths-only` flag returned only paths without validation
   - **New**: Flag removed, no equivalent functionality
   - **Impact**: Users relying on `--paths-only` will get "Unknown option" error

2. **Changed Exit Code Semantics**: Missing Bun runtime
   - **Old**: Exit code 1 (user error)
   - **New**: Exit code 2 (system error)
   - **Impact**: Scripts checking for exit code 1 will misinterpret failures

3. **Altered JSON Output Schema**: `--json` flag
   - **Old**: `{ FEATURE_DIR: string, AVAILABLE_DOCS: string[] }`
   - **New**: `{ feature_dir: string, docs: string[] }` (keys renamed, snake_case)
   - **Impact**: Parsers expecting `FEATURE_DIR` key will fail

**Resolution Options**:

1. **Skip this script** - Keep existing `check-prerequisites.ts` unchanged (preserves compatibility but misses upstream fixes)
2. **Best-effort transform** - Update TypeScript implementation, document breaking changes, add migration guide
3. **Abort transformation** - Exit without making any changes, resolve conflicts manually

**Recommendation**: Option 2 (Best-effort) - The breaking changes appear intentional (upstream standardizing on snake_case). Generate migration guide for users.
```

---

## CLI Interface Compatibility Requirements

**CRITICAL**: The generated TypeScript implementation MUST maintain
byte-for-byte compatibility with the bash script's CLI interface (unless breaking changes were approved via conflict resolution above).

### Exit Codes

Match exit codes exactly:

- **0**: Success
- **1**: User error (invalid arguments, invalid input)
- **2**: System error (network failure, filesystem error, external tool missing)

```typescript
// Example exit code handling
if (invalidVersion) {
  console.error("ERROR: Invalid version format");
  process.exit(1); // User error
}

if (networkError) {
  console.error("ERROR: GitHub API request failed");
  process.exit(2); // System error
}

console.log(JSON.stringify(result));
process.exit(0); // Success
```

### CLI Flags

Parse and handle ALL flags from the bash script:

```typescript
// Example flag parsing
interface CliOptions {
  json?: boolean;
  help?: boolean;
  version?: boolean;
  requireTasks?: boolean;
  includeTasks?: boolean;
  pathsOnly?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  return {
    json: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h"),
    version: args.includes("--version"),
    requireTasks: args.includes("--require-tasks"),
    includeTasks: args.includes("--include-tasks"),
    pathsOnly: args.includes("--paths-only"),
  };
}
```

### JSON Output Structure

When `--json` flag is used, output MUST match the bash script's JSON structure
exactly:

```typescript
// Example: Ensure JSON keys, types, and structure match bash output
interface CheckUpstreamOutput {
  releases: Array<{
    version: string;
    date: string;
    summary: string;
  }>;
}

// Output JSON to stdout
console.log(JSON.stringify(output));
```

### Error Messages

Preserve error message wording and formatting from bash script:

```bash
# Bash
echo "ERROR: Unknown option '$arg'. Use --help for usage information." >&2
exit 1
```

```typescript
// TypeScript
console.error(
  `ERROR: Unknown option '${arg}'. Use --help for usage information.`,
);
process.exit(1);
```

---

## Extension Marker Preservation

**CRITICAL**: SPECK-EXTENSION blocks take priority over upstream changes.

### Priority Order (Highest to Lowest)

1. **Existing TypeScript file extensions** (`.speck/scripts/<name>.ts`)
   - These are Speck-specific customizations and MUST be preserved
   - Copy verbatim into new transformation
2. **Source bash script extensions** (if no existing TypeScript file)
   - Adapt syntax from bash to TypeScript if this is first transformation
3. **Never merge or modify extension content** - preserve exactly as-is

### Handling Extension Blocks

When you find `[SPECK-EXTENSION:START]` and `[SPECK-EXTENSION:END]` markers:

1. **Detect markers** in both existing TypeScript (if exists) and source bash
   script
2. **Preserve content**:
   - If existing TypeScript has extension block → use that version verbatim
   - If only bash has extension block → adapt syntax to TypeScript
   - If both have different blocks → prefer TypeScript version, note conflict
3. **Adapt syntax** only when converting from bash (first transformation)
4. **Document** what was preserved and from which source

**Example**:

```bash
# Bash script with extension
echo "Upstream functionality"

# [SPECK-EXTENSION:START]
# Speck-specific: Additional validation for feature naming
if [[ ! "$FEATURE_NAME" =~ ^[0-9]{3}- ]]; then
  echo "ERROR: Feature name must start with ###-" >&2
  exit 1
fi
# [SPECK-EXTENSION:END]

echo "Continue upstream functionality"
```

```typescript
// TypeScript with preserved extension
console.log("Upstream functionality");

// [SPECK-EXTENSION:START]
// Speck-specific: Additional validation for feature naming
if (!/^[0-9]{3}-/.test(featureName)) {
  console.error("ERROR: Feature name must start with ###-");
  process.exit(1);
}
// [SPECK-EXTENSION:END]

console.log("Continue upstream functionality");
```

---

## Common Transformation Patterns

### Pattern 1: File Existence Checks

```bash
# Bash
if [ -f "$FILE" ]; then
  echo "File exists"
fi
```

```typescript
// TypeScript
import { existsSync } from "node:fs";
if (existsSync(file)) {
  console.log("File exists");
}
```

### Pattern 2: Read File Content

```bash
# Bash
CONTENT=$(cat file.txt)
```

```typescript
// TypeScript
const content = await Bun.file("file.txt").text();
```

### Pattern 3: Write File Content

```bash
# Bash
echo "content" > file.txt
```

```typescript
// TypeScript
await Bun.write("file.txt", "content");
```

### Pattern 4: JSON Manipulation

```bash
# Bash (using jq)
VERSION=$(cat package.json | jq -r '.version')
echo "{\"version\":\"$VERSION\"}" > output.json
```

```typescript
// TypeScript
const pkg = await Bun.file("package.json").json();
const version = pkg.version;
await Bun.write("output.json", JSON.stringify({ version }));
```

### Pattern 5: Command Execution

```bash
# Bash
git rev-parse --git-dir 2>/dev/null && echo "GIT_REPO" || echo "NOT_GIT_REPO"
```

```typescript
// TypeScript
import { $ } from "bun";
try {
  await $`git rev-parse --git-dir`.quiet();
  console.log("GIT_REPO");
} catch {
  console.log("NOT_GIT_REPO");
}
```

### Pattern 6: Directory Creation

```bash
# Bash
mkdir -p "$DIR"
```

```typescript
// TypeScript
import { mkdirSync } from "node:fs";
mkdirSync(dir, { recursive: true });
```

### Pattern 7: Symlink Creation

```bash
# Bash
ln -sf "$TARGET" "$LINK"
```

```typescript
// TypeScript
import { existsSync, symlinkSync, unlinkSync } from "node:fs";
if (existsSync(link)) {
  unlinkSync(link);
}
symlinkSync(target, link);
```

---

## Transformation Workflow

### Step 1: Analyze Bash Script

1. **Identify CLI interface**: Flags, arguments, exit codes
2. **Map dependencies**: External commands (git, jq, curl), sourced files
   (common.sh)
3. **Detect extension markers**: `[SPECK-EXTENSION:START/END]`
4. **Categorize operations**: File I/O, process execution, JSON manipulation,
   string processing

### Step 2: Choose Transformation Strategy

For each operation in the bash script:

- Can it be pure TypeScript? → Use native TypeScript
- Does it need shell-like syntax? → Use Bun Shell API
- Is it bash-specific and complex? → Use Bun.spawn() (document why)

### Step 3: Generate TypeScript Implementation

**CRITICAL**: Check for existing TypeScript file first to preserve
SPECK-EXTENSION blocks and minimize changes.

1. **Check for existing file**: Determine target path `.speck/scripts/<name>.ts`
   (e.g., `check-prerequisites.sh` → `check-prerequisites.ts`)
2. **Read existing file if present**:
   - Extract all `[SPECK-EXTENSION:START]` ... `[SPECK-EXTENSION:END]` blocks
   - Note existing implementation patterns and structure
   - Identify what actually needs to change vs. what can stay the same
3. **Generate new implementation**:
   - **Add header comment** documenting transformation rationale and what
     changed from previous version (if applicable)
   - **Import dependencies** (Bun APIs, Node.js modules)
   - **Implement CLI parsing** (flags, arguments, help text)
   - **Implement core logic** using chosen transformation strategy
   - **Preserve SPECK-EXTENSION blocks**:
     - First, copy any extension blocks from the **existing TypeScript file**
       (if it exists)
     - Second, adapt any extension blocks from the **source bash script**
     - If both exist and conflict, preserve TypeScript version and note the
       conflict
   - **Add error handling** with proper exit codes
   - **Format output** (JSON mode, human-readable mode)
4. **Minimize code changes, but ALWAYS update documentation**:
   - If the script is in CHANGED_BASH_SCRIPTS, the upstream bash changed
   - Determine what actually needs to change in the TypeScript implementation:
     - If the change requires code updates (new features, bug fixes, logic
       changes) → update the code
     - If the TypeScript is already functionally equivalent (e.g., already
       immune to a bash-specific security fix) → no code changes needed
   - **ALWAYS update the header documentation**:
     - Update "Transformation Date" to current date
     - Update "Source" to reference the new upstream version
     - Add a "Changes from vX.Y.Z to vA.B.C" section documenting:
       - What changed in upstream bash
       - Whether TypeScript code was updated or already equivalent
       - Why no code changes were needed (if applicable)
   - Keep existing code structure, variable names, and patterns where possible

### Step 4: Generate/Update Tests

**CRITICAL**: You MUST create or update tests for the generated TypeScript
implementation.

1. **Determine test file path**: Map `.speck/scripts/<name>.ts` →
   `tests/.speck-scripts/<name>.test.ts`
2. **Check for existing tests**: If test file exists, modify it; otherwise
   create new file
3. **Write lightweight contract tests** covering:
   - **CLI flag parsing**: `--help`, `--json`, `--version` (if applicable)
   - **Exit codes**: Test success (0), user error (1), system error (2)
     scenarios
   - **JSON output structure**: Verify `--json` produces valid JSON matching
     expected schema
   - **Basic execution**: Script runs without errors for valid inputs
4. **Test structure example**:

```typescript
// tests/.speck-scripts/check-prerequisites.test.ts
import { describe, expect, test } from "bun:test";
import { spawn } from "bun";

describe("check-prerequisites.ts", () => {
  const scriptPath = ".speck/scripts/check-prerequisites.ts";

  test("--help flag displays usage", async () => {
    const proc = spawn(["bun", scriptPath, "--help"]);
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
    const output = await new Response(proc.stdout).text();
    expect(output).toContain("Usage:");
  });

  test("--json flag outputs valid JSON", async () => {
    const proc = spawn(["bun", scriptPath, "--json"]);
    const exitCode = await proc.exited;
    const output = await new Response(proc.stdout).text();
    expect(exitCode).toBe(0);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test("exits with code 0 on success", async () => {
    const proc = spawn(["bun", scriptPath, "valid-arg"]);
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);
  });
});
```

### Step 5: Validate Generated Code

**CRITICAL**: You MUST verify the generated TypeScript compiles, executes, and
passes tests before reporting success.

1. **Type check the TypeScript**: Run `bun check <file>.ts` or verify imports
   and types are valid
2. **Compile verification**: Ensure there are no syntax errors or type errors
3. **Basic execution test**: Run the script with `--help` flag:
   `bun <file>.ts --help`
   - Verify it executes without errors
   - Verify exit code is 0
   - Verify help text is displayed
4. **Run the test suite**: Execute
   `bun test tests/.speck-scripts/<name>.test.ts`
   - All tests must pass
   - If tests fail, fix the generated code and re-run tests
   - Iterate until all tests pass
5. **Fix any errors**: If compilation, execution, or tests fail, fix the
   generated code before proceeding

### Step 6: Document Compatibility

1. **Document CLI interface** in header comment: flags, exit codes, JSON schema
2. **Preserve help text** from bash script (same wording, formatting)
3. **Match error messages** exactly (same wording, stderr vs stdout)
4. **Verify exit codes** match bash behavior

---

## Output Format

Generate a TypeScript file with this structure:

```typescript
/**
 * Bun TypeScript implementation of check-prerequisites.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v1.0.0/scripts/bash/check-prerequisites.sh
 * Strategy: Pure TypeScript (file I/O, JSON parsing) + Bun Shell API (git commands)
 *
 * CLI Interface:
 * - Flags: --json, --require-tasks, --include-tasks, --paths-only, --help
 * - Exit Codes: 0 (success), 1 (user error), 2 (system error)
 * - JSON Output: { FEATURE_DIR: string, AVAILABLE_DOCS: string[] }
 *
 * Transformation Rationale:
 * - Replaced bash file existence checks with Node.js fs.existsSync()
 * - Replaced jq JSON parsing with native JSON.parse()
 * - Preserved git commands using Bun Shell API for compatibility
 * - Preserved [SPECK-EXTENSION] blocks with adapted TypeScript syntax
 */

import { existsSync } from "node:fs";
import { $ } from "bun";

// Type definitions
interface CheckPrerequisitesOutput {
  FEATURE_DIR: string;
  AVAILABLE_DOCS: string[];
}

// CLI parsing
function parseArgs(args: string[]): CliOptions {
  // ...
}

// Main function
async function main(args: string[]): Promise<number> {
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    return 0;
  }

  // Implementation...

  if (options.json) {
    console.log(JSON.stringify(output));
  } else {
    printHumanReadable(output);
  }

  return 0;
}

// Entry point
const exitCode = await main(process.argv.slice(2));
process.exit(exitCode);
```

---

## Transformation Report

After transformation, generate a markdown report summarizing:

1. **Source file**: Path to bash script in `upstream/<version>/`
2. **Output file**: Path to generated TypeScript in `.speck/scripts/`
3. **Test file**: Path to generated/updated test file in `tests/.speck-scripts/`
4. **Strategy used**: Pure TypeScript / Bun Shell API / Bun.spawn() breakdown
5. **CLI compatibility**: Flags, exit codes, JSON schema preserved
6. **Extensions preserved**: List of `[SPECK-EXTENSION]` blocks maintained
7. **Rationale**: Why this transformation approach was chosen
8. **Validation results**:
   - ✅ Compilation successful (or ❌ with error details)
   - ✅ Basic execution test passed (or ❌ with error details)
   - ✅ All tests passed (X/Y tests) (or ❌ with failure details)

**Example Report Section**:

```markdown
## check-prerequisites.ts

**Source**: `upstream/v1.0.0/scripts/bash/check-prerequisites.sh` **Output**:
`.speck/scripts/check-prerequisites.ts` **Existing File**: Yes (updated) / No
(created new) **Test File**: `tests/.speck-scripts/check-prerequisites.test.ts`
(3 tests updated) **Strategy**: 70% Pure TypeScript, 20% Bun Shell API, 10%
sourced common functions

**Transformations**:

- Bash file checks (`[ -f ]`) → Node.js `existsSync()`
- jq JSON parsing → Native `JSON.parse()`
- Git commands → Bun Shell API (`$\`git ...\``)
- Bash functions from common.sh → TypeScript imports from `common/utils.ts`

**Changes Made** (if existing file):

- Updated git command error handling (upstream added retry logic)
- Added new `--version` flag support
- Preserved existing SPECK-EXTENSION block (lines 78-85) for custom validation
- Kept existing code structure and variable names

**CLI Compatibility**:

- ✅ All flags preserved: --json, --require-tasks, --include-tasks,
  --paths-only, --help, --version
- ✅ Exit codes match: 0 (success), 1 (invalid args), 2 (missing files)
- ✅ JSON output structure identical to bash version

**Extensions Preserved**: 1 block from existing TypeScript (lines 78-85) -
custom feature name validation

**Validation Results**:

- ✅ Compilation successful (no type errors)
- ✅ Basic execution test passed (`--help` displays usage)
- ✅ All tests passed (4/4 tests) - added 1 new test for --version flag
  - ✅ --help flag displays usage
  - ✅ --json flag outputs valid JSON
  - ✅ --version flag displays version
  - ✅ exits with code 0 on success

**Testing Priority**: HIGH - This is a core prerequisite checker used by all
commands
```

---

## Error Handling

### Conflicting Extension Markers

If upstream changes overlap with `[SPECK-EXTENSION]` blocks:

1. **HALT transformation** immediately
2. **Report conflict** with details:
   - Which file contains conflict
   - Line numbers of extension block
   - What changed in upstream
3. **Offer resolution options**:
   - Skip this file (keep existing Speck version)
   - Manual merge required (abort transformation, ask user to resolve)
   - Abort entire transformation

**Example Conflict Report**:

```markdown
## ⚠️ TRANSFORMATION CONFLICT DETECTED

**File**: `check-prerequisites.sh` **Extension Block**: Lines 45-52 **Upstream
Change**: Lines 48-50 modified (added new validation logic)

**Conflict**: Upstream change overlaps with Speck extension for feature naming
validation.

**Resolution Options**:

1. Skip this file - keep existing `.speck/scripts/check-prerequisites.ts`
2. Manual merge - halt transformation, ask user to merge manually
3. Abort transformation - exit with error, no changes made

**Recommendation**: Option 2 (Manual merge) - upstream validation may conflict
with Speck's naming requirements
```

### Missing Dependencies

If bash script depends on external tools not available in Bun/Node.js:

1. **Document dependency** in transformation report
2. **Choose fallback strategy**:
   - Can it be reimplemented in pure TypeScript? (preferred)
   - Can Bun Shell API replicate behavior?
   - Must use Bun.spawn() to call external tool?
3. **Add runtime check** if external tool required:

```typescript
// Example: Check if git is installed
try {
  await $`git --version`.quiet();
} catch {
  console.error("ERROR: git not found. Please install git.");
  process.exit(2);
}
```

---

## Best Practices

1. **Preserve comments**: Keep useful comments from bash script, translate to
   TypeScript style
2. **Add type safety**: Use TypeScript interfaces for JSON structures
3. **Error messages**: Match bash wording exactly for consistency
4. **Performance**: Prefer async/await over synchronous operations when possible
5. **Readability**: Generated code should be more readable than bash (TypeScript
   clarity)
6. **Testing**: Each transformation should have corresponding contract tests
7. **Documentation**: Header comment should explain transformation choices

---

## Invocation Example

This agent is invoked by `/speck.transform-upstream` like this:

```typescript
// In .speck/scripts/transform-upstream.ts
import { spawnSync } from "bun";

const agentResult = spawnSync(
  ["claude", "agent", ".claude/agents/transform-bash-to-bun.md"],
  {
    env: {
      UPSTREAM_VERSION: "v1.0.0",
      SOURCE_SCRIPTS: "upstream/v1.0.0/scripts/bash/*.sh",
      OUTPUT_DIR: ".speck/scripts/",
    },
  },
);
```

The agent should output:

1. Generated TypeScript files in `.speck/scripts/`
2. Transformation report (markdown) to stdout
3. Exit code 0 on success, 2 on conflict/error
