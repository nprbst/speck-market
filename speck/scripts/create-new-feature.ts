#!/usr/bin/env bun

/**
 * Create New Feature Script
 *
 * Bun TypeScript implementation of create-new-feature.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.85/.specify/scripts/bash/create-new-feature.sh
 * Strategy: Pure TypeScript (file ops, string manipulation) + Bun Shell API (git commands)
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" to cd command for SCRIPT_DIR (security fix)
 * - TypeScript implementation already immune: uses import.meta.dir instead of cd
 * - No code changes needed, only documentation updated to track v0.0.85
 *
 * CLI Interface:
 * - Flags: --json, --short-name <name>, --number N, --help
 * - Exit Codes: 0 (success), 1 (user error)
 * - JSON Output: { BRANCH_NAME, SPEC_FILE, FEATURE_NUM }
 *
 * Transformation Rationale:
 * - Replaced bash string manipulation with native TypeScript
 * - Replaced git commands with Bun Shell API
 * - Replaced bash loops with TypeScript for...of loops
 * - Preserved all CLI flags and argument parsing logic
 */

import { existsSync, mkdirSync, readdirSync, copyFileSync, symlinkSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";
import { ExitCode } from "./contracts/cli-interface";
import { getTemplatesDir, detectSpeckRoot } from "./common/paths";
import {
  formatJsonOutput,
  formatHookOutput,
  detectOutputMode,
  type OutputMode,
} from "./lib/output-formatter";
import { loadConfig } from "./worktree/config";
import { constructWorktreePath } from "./worktree/naming";
import { writeWorktreeHandoff } from "./worktree/handoff";
import { launchIDE } from "./worktree/ide-launch";
import {
  readBranches,
  writeBranches,
  createBranchEntry,
  addBranchEntry,
} from "./common/branch-mapper";

/**
 * CLI options for create-new-feature
 */
interface CreateFeatureOptions {
  json: boolean;
  hook: boolean;
  shortName?: string;
  number?: number;
  branch?: string;      // T081: Custom branch name (non-standard, recorded in branches.json)
  sharedSpec: boolean;  // T064-T066: Create spec at speckRoot with local symlinks
  localSpec: boolean;   // T067: Create spec locally in child repo
  noWorktree: boolean;  // T053: Disable worktree creation even if config enables it
  worktree: boolean;    // Force worktree creation even if config disables it
  noIde: boolean;       // Skip IDE launch (for deferred launch by /speck.specify)
  help: boolean;
  featureDescription: string;
}

/**
 * JSON output for create-new-feature
 */
interface CreateFeatureOutput {
  BRANCH_NAME: string;
  SPEC_FILE: string;
  FEATURE_NUM: string;
  WORKTREE_PATH?: string;
}

/**
 * Parse result type for command line arguments
 */
type ParseResult =
  | { success: true; options: CreateFeatureOptions }
  | { success: false; error: string };

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): ParseResult {
  const options: CreateFeatureOptions = {
    json: false,
    hook: false,
    branch: undefined,
    sharedSpec: false,
    localSpec: false,
    noWorktree: false,
    worktree: false,
    noIde: false,
    help: false,
    featureDescription: "",
  };

  const positionalArgs: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i]!;

    if (arg === "--json") {
      options.json = true;
      i++;
    } else if (arg === "--hook") {
      options.hook = true;
      i++;
    } else if (arg === "--short-name") {
      if (i + 1 >= args.length || args[i + 1]?.startsWith("--")) {
        return { success: false, error: "--short-name requires a value" };
      }
      options.shortName = args[i + 1]!;
      i += 2;
    } else if (arg === "--number") {
      if (i + 1 >= args.length || args[i + 1]?.startsWith("--")) {
        return { success: false, error: "--number requires a value" };
      }
      const num = parseInt(args[i + 1]!, 10);
      if (isNaN(num)) {
        return { success: false, error: "--number requires a numeric value" };
      }
      options.number = num;
      i += 2;
    } else if (arg === "--branch") {
      // T081: Custom branch name (non-standard, recorded in branches.json)
      if (i + 1 >= args.length || args[i + 1]?.startsWith("--")) {
        return { success: false, error: "--branch requires a value" };
      }
      options.branch = args[i + 1]!;
      i += 2;
    } else if (arg === "--shared-spec") {
      options.sharedSpec = true;
      i++;
    } else if (arg === "--local-spec") {
      options.localSpec = true;
      i++;
    } else if (arg === "--no-worktree") {
      options.noWorktree = true;
      i++;
    } else if (arg === "--worktree") {
      options.worktree = true;
      i++;
    } else if (arg === "--no-ide") {
      options.noIde = true;
      i++;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
      i++;
    } else {
      positionalArgs.push(arg);
      i++;
    }
  }

  options.featureDescription = positionalArgs.join(" ");
  return { success: true, options };
}

/**
 * Show help message
 */
function showHelp(): void {
  const scriptName = path.basename(process.argv[1]!);
  console.log(`Usage: ${scriptName} [--json] [--hook] [--short-name <name>] [--number N] [--branch <name>] [--shared-spec | --local-spec] [--worktree | --no-worktree] [--no-ide] <feature_description>

Options:
  --json              Output in JSON format (structured JSON envelope)
  --hook              Output hook-formatted response for Claude Code hooks
  --short-name <name> Provide a custom short name (2-4 words) for the branch
  --number N          Specify branch number manually (overrides auto-detection)
  --branch <name>     Use a custom branch name (non-standard, recorded in branches.json)
  --shared-spec       Create spec at speckRoot (multi-repo shared spec with local symlinks)
  --local-spec        Create spec locally in child repo (single-repo or child-only spec)
  --worktree          Create a worktree with handoff artifacts (overrides config)
  --no-worktree       Disable worktree creation (overrides config)
  --no-ide            Skip IDE launch (for deferred launch by /speck.specify)
  --help, -h          Show this help message

Worktree Mode:
  When worktree mode is enabled (via config or --worktree), this command:
  1. Creates a branch and worktree atomically (no checkout switching)
  2. Writes session handoff artifacts to the worktree
  3. Launches IDE in the new worktree

Non-Standard Branch Names:
  When --branch is used with a name that doesn't follow the NNN-name pattern,
  the branch-to-spec mapping is recorded in .speck/branches.json for later lookup.

Examples:
  ${scriptName} 'Add user authentication system' --short-name 'user-auth'
  ${scriptName} 'Implement OAuth2 integration for API' --number 5 --shared-spec
  ${scriptName} 'Fix login bug' --worktree
  ${scriptName} 'My feature' --branch 'nprbst/custom-feature'`);
}

/**
 * Output error in the appropriate format
 */
function outputError(
  code: string,
  message: string,
  outputMode: OutputMode,
  startTime: number,
  recovery?: string[]
): void {
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: false,
      error: { code, message, recovery },
      command: "create-new-feature",
      startTime,
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    console.error(`ERROR: ${message}`);
  } else {
    console.error(`Error: ${message}`);
  }
}

/**
 * Find repository root by searching for project markers
 */
function findRepoRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(path.join(dir, ".git")) || existsSync(path.join(dir, ".specify")) || existsSync(path.join(dir, ".speck"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Get highest number from specs directory
 */
function getHighestFromSpecs(specsDir: string): number {
  let highest = 0;

  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(/^(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > highest) {
            highest = num;
          }
        }
      }
    }
  }

  return highest;
}

/**
 * Check existing branches and return next available number
 */
async function checkExistingBranches(shortName: string, specsDir: string): Promise<number> {
  // Fetch all remotes to get latest branch info
  try {
    await $`git fetch --all --prune`.quiet();
  } catch {
    // Ignore fetch errors
  }

  let maxNum = 0;

  // Check remote branches
  try {
    const result = await $`git ls-remote --heads origin`.quiet();
    const lines = result.text().split("\n");
    for (const line of lines) {
      const match = line.match(new RegExp(`refs/heads/(\\d+)-${shortName}$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  } catch {
    // No remote or ls-remote failed
  }

  // Check local branches
  try {
    const result = await $`git branch`.quiet();
    const branches = result.text().split("\n");
    for (const branch of branches) {
      const match = branch.match(new RegExp(`^[* ]*?(\\d+)-${shortName}$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  } catch {
    // Git not available
  }

  // Check specs directory
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(new RegExp(`^(\\d+)-${shortName}$`));
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }

  return maxNum + 1;
}

/**
 * Clean and format a branch name
 */
function cleanBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
}

/**
 * Generate branch name with stop word filtering
 */
function generateBranchName(description: string): string {
  // Common stop words to filter out
  const stopWords = new Set([
    "i", "a", "an", "the", "to", "for", "of", "in", "on", "at", "by",
    "with", "from", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "can", "may", "might", "must", "shall", "this", "that",
    "these", "those", "my", "your", "our", "their", "want", "need",
    "add", "get", "set",
  ]);

  // Convert to lowercase and split into words
  const cleanName = description.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const words = cleanName.split(/\s+/).filter((w) => w.length > 0);

  // Filter words: remove stop words and short words (unless they look like acronyms)
  const meaningfulWords: string[] = [];
  for (const word of words) {
    if (stopWords.has(word)) {
      continue;
    }

    // Keep words that are >= 3 chars OR appear as uppercase in original (likely acronyms)
    if (word.length >= 3) {
      meaningfulWords.push(word);
    } else {
      const upperWord = word.toUpperCase();
      if (description.includes(upperWord)) {
        meaningfulWords.push(word);
      }
    }
  }

  // Use first 3-4 meaningful words
  if (meaningfulWords.length > 0) {
    const maxWords = meaningfulWords.length === 4 ? 4 : 3;
    return meaningfulWords.slice(0, maxWords).join("-");
  }

  // Fallback: use cleaned description (first 3 words)
  const cleaned = cleanBranchName(description);
  return cleaned
    .split("-")
    .filter((w) => w.length > 0)
    .slice(0, 3)
    .join("-");
}

/**
 * Main function
 */
export async function main(args: string[]): Promise<number> {
  const startTime = Date.now();
  const parseResult = parseArgs(args);

  // Handle parse errors (need to detect outputMode first from raw args)
  if (!parseResult.success) {
    const hasJsonFlag = args.includes("--json");
    const hasHookFlag = args.includes("--hook");
    const outputMode = detectOutputMode({ json: hasJsonFlag, hook: hasHookFlag });
    outputError(
      "INVALID_ARGS",
      parseResult.error,
      outputMode,
      startTime
    );
    return ExitCode.USER_ERROR;
  }

  const options = parseResult.options;
  const outputMode = detectOutputMode(options);

  if (options.help) {
    showHelp();
    return ExitCode.SUCCESS;
  }

  if (!options.featureDescription) {
    outputError(
      "MISSING_DESCRIPTION",
      "Feature description is required",
      outputMode,
      startTime,
      ["Provide a description: create-new-feature '<feature description>'"]
    );
    return ExitCode.USER_ERROR;
  }

  // Resolve repository root and detect multi-repo mode
  let repoRoot: string;
  let hasGit = false;

  try {
    const result = await $`git rev-parse --show-toplevel`.quiet();
    repoRoot = result.text().trim();
    hasGit = true;
  } catch {
    const scriptDir = import.meta.dir;
    const foundRoot = findRepoRoot(scriptDir);
    if (!foundRoot) {
      outputError(
        "REPO_NOT_FOUND",
        "Could not determine repository root. Please run this script from within the repository.",
        outputMode,
        startTime
      );
      return ExitCode.USER_ERROR;
    }
    repoRoot = foundRoot;
    hasGit = false;
  }

  // [SPECK-EXTENSION:START] T064-T066: Multi-repo shared spec support
  const config = await detectSpeckRoot();

  // Determine spec location (speckRoot for shared specs, repoRoot for local specs)
  let specsDir: string;
  let isSharedSpec = false;
  if (options.sharedSpec && config.mode === 'multi-repo') {
    // T064: Create shared spec at speckRoot
    specsDir = path.join(config.speckRoot, "specs");
    isSharedSpec = true;
  } else {
    // T067: Create local spec at repoRoot (default behavior)
    specsDir = path.join(repoRoot, "specs");
  }
  mkdirSync(specsDir, { recursive: true });
  // [SPECK-EXTENSION:END]

  // [SPECK-EXTENSION:START] T081: Non-standard branch name support
  // Generate branch name with support for custom non-standard names
  let branchName: string;
  let specId: string; // The spec directory name (always NNN-short-name format)
  let featureNum: string; // Numeric prefix for output (e.g., "015")

  if (options.branch) {
    // T081: Custom branch name provided - use as-is
    branchName = options.branch;

    // Still need to generate spec ID (directory name)
    let branchSuffix: string;
    if (options.shortName) {
      branchSuffix = cleanBranchName(options.shortName);
    } else {
      branchSuffix = generateBranchName(options.featureDescription);
    }

    let branchNumber: number;
    if (options.number !== undefined) {
      branchNumber = options.number;
    } else if (hasGit) {
      branchNumber = await checkExistingBranches(branchSuffix, specsDir);
    } else {
      const highest = getHighestFromSpecs(specsDir);
      branchNumber = highest + 1;
    }

    featureNum = branchNumber.toString().padStart(3, "0");
    specId = `${featureNum}-${branchSuffix}`;
  } else {
    // Standard branch name generation
    let branchSuffix: string;
    if (options.shortName) {
      branchSuffix = cleanBranchName(options.shortName);
    } else {
      branchSuffix = generateBranchName(options.featureDescription);
    }

    // Determine branch number
    let branchNumber: number;
    if (options.number !== undefined) {
      branchNumber = options.number;
    } else if (hasGit) {
      branchNumber = await checkExistingBranches(branchSuffix, specsDir);
    } else {
      const highest = getHighestFromSpecs(specsDir);
      branchNumber = highest + 1;
    }

    featureNum = branchNumber.toString().padStart(3, "0");
    branchName = `${featureNum}-${branchSuffix}`;

    // GitHub enforces a 244-byte limit on branch names
    const maxBranchLength = 244;
    if (branchName.length > maxBranchLength) {
      const maxSuffixLength = maxBranchLength - 4; // 3 digits + hyphen
      const truncatedSuffix = branchSuffix.substring(0, maxSuffixLength).replace(/-$/, "");

      console.error(`[specify] Warning: Branch name exceeded GitHub's 244-byte limit`);
      console.error(`[specify] Original: ${branchName} (${branchName.length} bytes)`);

      branchName = `${featureNum}-${truncatedSuffix}`;
      console.error(`[specify] Truncated to: ${branchName} (${branchName.length} bytes)`);
    }

    specId = branchName; // For standard branches, spec ID equals branch name
  }

  // Record branch mapping in branches.json (always, for complete tracking)
  if (hasGit) {
    try {
      const branchMapping = await readBranches(repoRoot);
      const entry = createBranchEntry(branchName, specId);
      const updatedMapping = addBranchEntry(branchMapping, entry);
      await writeBranches(repoRoot, updatedMapping);

      if (outputMode === "human") {
        console.log(`[speck] Recorded branch mapping: ${branchName} → ${specId}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Non-fatal: warn but continue
      console.error(`[speck] Warning: Failed to record branch mapping: ${errorMessage}`);
    }
  }
  // [SPECK-EXTENSION:END]

  // [SPECK-EXTENSION:START] T048, T053, T054: Worktree + Handoff Integration
  // Determine if worktree mode should be used
  let worktreePath: string | undefined;
  let useWorktree = false;
  const warnings: string[] = [];

  if (hasGit) {
    // Load worktree config to check if worktree mode is enabled
    const worktreeConfig = await loadConfig(repoRoot);
    const configEnablesWorktree = worktreeConfig.worktree.enabled;

    // T053: --no-worktree and --worktree flags override config
    if (options.noWorktree) {
      useWorktree = false;
    } else if (options.worktree) {
      useWorktree = true;
    } else {
      useWorktree = configEnablesWorktree;
    }

    if (useWorktree) {
      // T048: Use atomic `git worktree add -b` for worktree mode
      // This creates branch + worktree without changing current checkout
      try {
        worktreePath = await constructWorktreePath(repoRoot, worktreeConfig.worktree, branchName);

        // Create branch and worktree atomically
        const result = await $`git worktree add -b ${branchName} ${worktreePath} HEAD`.nothrow();
        if (result.exitCode !== 0) {
          throw new Error(`git worktree add failed: ${result.stderr.toString()}`);
        }

        if (outputMode === "human") {
          console.log(`[speck] Created worktree at: ${worktreePath}`);
        }

        // T048a-d, T054: Write handoff artifacts (graceful degradation)
        try {
          // Extract feature title from description
          const featureTitle = options.featureDescription.charAt(0).toUpperCase() +
            options.featureDescription.slice(1);

          // Calculate relative spec path from worktree
          // T081: Use specId for spec directory (always NNN-short-name format)
          const relativeSpecDir = path.join("specs", specId);
          const relativeSpecPath = path.join(relativeSpecDir, "spec.md");

          writeWorktreeHandoff(worktreePath, {
            featureName: featureTitle,
            branchName,
            specPath: relativeSpecPath,
            context: options.featureDescription,
            status: "not-started",
          });

          if (outputMode === "human") {
            console.log(`[speck] Written handoff artifacts to worktree`);
          }
        } catch (error) {
          // T054: Non-fatal - worktree still works without handoff
          const errorMessage = error instanceof Error ? error.message : String(error);
          warnings.push(`Failed to write handoff artifacts: ${errorMessage}`);
          if (outputMode === "human") {
            console.error(`[speck] Warning: Failed to write handoff artifacts: ${errorMessage}`);
          }
        }

        // Launch IDE in worktree if configured (skip if --no-ide flag passed)
        if (worktreeConfig.worktree.ide.autoLaunch && !options.noIde) {
          try {
            const ideResult = launchIDE({
              worktreePath,
              editor: worktreeConfig.worktree.ide.editor,
              newWindow: worktreeConfig.worktree.ide.newWindow,
            });

            if (!ideResult.success) {
              warnings.push(`IDE launch failed: ${ideResult.error}`);
              if (outputMode === "human") {
                console.error(`[speck] Warning: IDE launch failed: ${ideResult.error}`);
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            warnings.push(`IDE launch error: ${errorMessage}`);
          }
        }
      } catch (error) {
        // Worktree creation failed - fall back to regular checkout
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (outputMode === "human") {
          console.error(`[speck] Warning: Worktree creation failed, falling back to branch checkout: ${errorMessage}`);
        }
        warnings.push(`Worktree creation failed: ${errorMessage}`);
        worktreePath = undefined;
        useWorktree = false;

        // Try regular branch checkout
        try {
          await $`git checkout -b ${branchName}`;
        } catch (checkoutError) {
          outputError(
            "GIT_BRANCH_FAILED",
            `Failed to create git branch: ${String(checkoutError)}`,
            outputMode,
            startTime
          );
          return ExitCode.USER_ERROR;
        }
      }
    } else {
      // Regular branch checkout (non-worktree mode)
      try {
        await $`git checkout -b ${branchName}`;
      } catch (error) {
        outputError(
          "GIT_BRANCH_FAILED",
          `Failed to create git branch: ${String(error)}`,
          outputMode,
          startTime
        );
        return ExitCode.USER_ERROR;
      }
    }
  } else if (outputMode === "human") {
    console.error(`[specify] Warning: Git repository not detected; skipped branch creation for ${branchName}`);
  }
  // [SPECK-EXTENSION:END]

  // [SPECK-EXTENSION:START] T073-T075: Phase 9 - Branch Management (Multi-Repo)
  // T073: Create spec-named branch in parent repo when creating shared spec
  if (isSharedSpec && config.mode === 'multi-repo') {
    const parentRepoRoot = config.speckRoot;

    // T074: Check if parent is a git repo; if not, prompt user to initialize
    let parentHasGit = false;
    try {
      const result = await $`git -C ${parentRepoRoot} rev-parse --git-dir`.quiet();
      if (result.exitCode === 0) {
        parentHasGit = true;
      }
    } catch {
      // Parent is not a git repo
    }

    if (!parentHasGit) {
      // T074: Prompt user to initialize parent as git repo
      console.error(`[specify] Notice: Parent directory is not a git repository: ${parentRepoRoot}`);
      console.error(`[specify] To enable branch coordination, initialize it as a git repo:`);
      console.error(`[specify]   cd ${parentRepoRoot} && git init`);
      console.error(`[specify] Skipping parent branch creation for now.`);
    } else {
      // T073: Create spec-named branch in parent repo
      try {
        // Check if branch already exists in parent
        let branchExistsInParent = false;
        try {
          const checkResult = await $`git -C ${parentRepoRoot} rev-parse --verify ${branchName}`.quiet();
          branchExistsInParent = (checkResult.exitCode === 0);
        } catch {
          branchExistsInParent = false;
        }

        if (branchExistsInParent) {
          // Branch exists, check it out
          await $`git -C ${parentRepoRoot} checkout ${branchName}`.quiet();
          if (!options.json) {
            console.log(`[specify] Checked out existing branch in parent repo: ${branchName}`);
          }
        } else {
          // Create new branch in parent repo
          const createResult = await $`git -C ${parentRepoRoot} checkout -b ${branchName}`.quiet();
          if (createResult.exitCode !== 0) {
            throw new Error(`git checkout -b failed with exit code ${String(createResult.exitCode)}: ${String(createResult.stderr)}`);
          }
          if (!options.json) {
            console.log(`[specify] Created branch in parent repo: ${branchName}`);
          }
        }
      } catch (error) {
        console.error(`[specify] Warning: Failed to create branch in parent repo: ${String(error)}`);
        console.error(`[specify] Parent repo: ${parentRepoRoot}`);
        console.error(`[specify] You may need to manually create the branch: git -C ${parentRepoRoot} checkout -b ${branchName}`);
      }
    }
  }
  // T075: Skip parent branch creation when creating local (child-only) spec
  // (handled by if condition above - only runs for shared specs)
  // [SPECK-EXTENSION:END]

  // [SPECK-EXTENSION:START] T064-T066, T119: Handle shared vs local spec creation
  // T119: In worktree mode, write spec to worktree's specs/ directory (not main repo)
  // This ensures spec.md is created on the feature branch, not main
  // EXCEPTION: --shared-spec in multi-repo mode always uses speckRoot/specs/
  let actualSpecsDir: string;
  if (isSharedSpec) {
    // T064: Shared spec always goes to speckRoot/specs/ (ignores worktree)
    actualSpecsDir = specsDir; // Already set to path.join(config.speckRoot, "specs")
  } else if (useWorktree && worktreePath) {
    // T119: Worktree mode (non-shared): spec goes into worktree's specs/ directory
    actualSpecsDir = path.join(worktreePath, "specs");
  } else {
    // Non-worktree mode: use previously determined specsDir (repoRoot)
    actualSpecsDir = specsDir;
  }

  // Create feature directory at the determined location
  // T081: Use specId for directory (always NNN-short-name format, even with custom branch)
  const featureDir = path.join(actualSpecsDir, specId);
  mkdirSync(featureDir, { recursive: true });

  // Copy template to the spec location
  const template = path.join(getTemplatesDir(), "spec-template.md");
  const specFile = path.join(featureDir, "spec.md");
  if (existsSync(template)) {
    copyFileSync(template, specFile);
  } else {
    // Create empty spec file
    await Bun.write(specFile, "");
  }

  // T065-T066: If shared spec in multi-repo mode, create local directory and symlink
  if (options.sharedSpec && config.mode === 'multi-repo') {
    // T065: Create local specs/NNN-feature/ directory in child repo
    const localFeatureDir = path.join(repoRoot, "specs", specId);
    mkdirSync(localFeatureDir, { recursive: true });

    // T066: Symlink parent spec.md into child's local specs/NNN-feature/
    const localSpecFile = path.join(localFeatureDir, "spec.md");

    // Calculate relative path from local spec location to shared spec
    const relativePath = path.relative(localFeatureDir, specFile);

    try {
      symlinkSync(relativePath, localSpecFile, 'file');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Warning: Failed to create symlink for spec.md: ${errorMessage}`);
        console.error(`  From: ${localSpecFile}`);
        console.error(`  To: ${specFile}`);
      }
    }

    // T069: Symlink contracts/ directory if it exists at shared location
    // const _sharedContractsDir = path.join(featureDir, "contracts");
    // const _localContractsLink = path.join(localFeatureDir, "contracts");

    // Note: contracts/ might not exist yet, but we'll check when it gets created
    // For now, just document that this will be handled by /speck.plan or later commands
    // Actually, we should add a utility function that can be called to sync contracts/
  }
  // [SPECK-EXTENSION:END]

  // Set SPECIFY_FEATURE environment variable (note: this only affects this process)
  process.env.SPECIFY_FEATURE = branchName;

  // Build output data
  const outputData: CreateFeatureOutput = {
    BRANCH_NAME: branchName,
    SPEC_FILE: specFile,
    FEATURE_NUM: featureNum,
    WORKTREE_PATH: worktreePath,
  };

  // Output results based on mode
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: true,
      data: outputData,
      command: "create-new-feature",
      startTime,
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    const hookOutput = formatHookOutput({
      hookType: "UserPromptSubmit",
      context: `<!-- SPECK_FEATURE_CREATED\n${JSON.stringify(outputData)}\n-->`,
    });
    console.log(JSON.stringify(hookOutput));
  } else {
    console.log(`BRANCH_NAME: ${branchName}`);
    console.log(`SPEC_FILE: ${specFile}`);
    console.log(`FEATURE_NUM: ${featureNum}`);
    if (worktreePath) {
      console.log(`WORKTREE_PATH: ${worktreePath}`);
    }
    console.log(`SPECIFY_FEATURE environment variable set to: ${branchName}`);
  }

  return ExitCode.SUCCESS;
}

/**
 * Entry point
 */
if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
