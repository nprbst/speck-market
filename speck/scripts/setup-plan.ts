#!/usr/bin/env bun

/**
 * Setup Plan Script
 *
 * Bun TypeScript implementation of setup-plan.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.85/.specify/scripts/bash/setup-plan.sh
 * Strategy: Pure TypeScript (file I/O, path operations) + imports from common/paths.ts
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" to cd command for SCRIPT_DIR (security fix)
 * - TypeScript implementation already immune: uses import.meta.dir instead of cd
 * - No code changes needed, only documentation updated to track v0.0.85
 *
 * CLI Interface:
 * - Flags: --json, --help
 * - Exit Codes: 0 (success), 1 (user error)
 * - JSON Output: { FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH, HAS_GIT }
 *
 * Transformation Rationale:
 * - Replaced bash file operations with Bun.write() and fs operations
 * - Replaced eval/source pattern with TypeScript imports
 * - Preserved all CLI flags and output format exactly
 */

import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";
import {
  getFeaturePaths,
  checkFeatureBranch,
  getTemplatesDir,
  detectSpeckRoot,
} from "./common/paths";
import { ExitCode } from "./contracts/cli-interface";

/**
 * CLI options for setup-plan
 */
interface SetupPlanOptions {
  json: boolean;
  help: boolean;
}

/**
 * JSON output for setup-plan
 */
interface SetupPlanOutput {
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  SPECS_DIR: string;
  BRANCH: string;
  HAS_GIT: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): SetupPlanOptions {
  return {
    json: args.includes("--json"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`Usage: setup-plan [--json]
  --json    Output results in JSON format
  --help    Show this help message`);
}

/**
 * Main function
 */
export async function main(args: string[]): Promise<number> {
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return ExitCode.SUCCESS;
  }

  // Get all paths and variables from common functions
  const paths = await getFeaturePaths();
  const hasGitRepo = paths.HAS_GIT === "true";

  // Check if we're on a proper feature branch (only for git repos)
  if (!await checkFeatureBranch(paths.CURRENT_BRANCH, hasGitRepo, paths.REPO_ROOT)) {
    return ExitCode.USER_ERROR;
  }

  // Ensure the feature directory exists
  mkdirSync(paths.FEATURE_DIR, { recursive: true });

  // [SPECK-EXTENSION:START] T076-T079: Phase 9 - Branch Management (Multi-Repo)
  // T076: Create spec-named branch in child repo if not already on that branch
  const branchName = paths.CURRENT_BRANCH;
  const config = await detectSpeckRoot();

  if (hasGitRepo) {
    // Check if we're on the correct branch
    try {
      const currentBranch = await $`git rev-parse --abbrev-ref HEAD`.quiet();
      const currentBranchName = currentBranch.text().trim();

      if (currentBranchName !== branchName) {
        // Try to checkout or create the branch
        try {
          await $`git checkout ${branchName}`.quiet();
          console.log(`[specify] Checked out branch: ${branchName}`);
        } catch {
          // Branch doesn't exist, create it
          await $`git checkout -b ${branchName}`.quiet();
          console.log(`[specify] Created and checked out branch: ${branchName}`);
        }
      }
    } catch (error) {
      console.error(`[specify] Warning: Could not manage git branch: ${String(error)}`);
    }

    // T077-T079: Validate parent repo is on matching branch when using shared spec
    // Check if spec is shared (in multi-repo mode, FEATURE_SPEC points to shared spec at speckRoot)
    // A spec is shared if it exists at the speck root
    const specFile = paths.FEATURE_SPEC;
    const isSharedSpec = (config.mode === 'multi-repo' && existsSync(specFile));

    // T077: Validate parent branch if using shared spec in multi-repo mode
    if (isSharedSpec) {
      const parentRepoRoot = config.speckRoot;

      // T079: Skip validation if parent is not a git repo
      let parentHasGit = false;
      try {
        const result = await $`git -C ${parentRepoRoot} rev-parse --git-dir`.quiet();
        if (result.exitCode === 0) {
          parentHasGit = true;
        }
      } catch {
        // Parent is not a git repo
      }

      if (parentHasGit) {
        try {
          const parentBranch = await $`git -C ${parentRepoRoot} rev-parse --abbrev-ref HEAD`.quiet();
          const parentBranchName = parentBranch.text().trim();

          if (parentBranchName !== branchName) {
            // T077: Warn if parent is on different branch
            console.error(`[specify] Warning: Parent repo branch mismatch!`);
            console.error(`[specify]   Child repo (current): ${branchName}`);
            console.error(`[specify]   Parent repo: ${parentBranchName}`);
            console.error(`[specify]   Parent location: ${parentRepoRoot}`);
            console.error(`[specify] Consider checking out matching branch in parent:`);
            console.error(`[specify]   git -C ${parentRepoRoot} checkout ${branchName}`);
          }
        } catch (error) {
          console.error(`[specify] Warning: Could not check parent repo branch: ${String(error)}`);
        }
      }
    }
    // T078: Skip parent validation when using local (child-only) spec
    // (handled by if condition above - only validates for shared specs)
  }
  // [SPECK-EXTENSION:END]

  // Copy plan template if it exists
  const template = path.join(getTemplatesDir(), "plan-template.md");
  if (existsSync(template)) {
    copyFileSync(template, paths.IMPL_PLAN);
    console.log(`Copied plan template to ${paths.IMPL_PLAN}`);
  } else {
    console.log(`Warning: Plan template not found at ${template}`);
    // Create a basic plan file if template doesn't exist
    await Bun.write(paths.IMPL_PLAN, "");
  }

  // Output results
  if (options.json) {
    const output: SetupPlanOutput = {
      FEATURE_SPEC: paths.FEATURE_SPEC,
      IMPL_PLAN: paths.IMPL_PLAN,
      SPECS_DIR: paths.FEATURE_DIR,
      BRANCH: paths.CURRENT_BRANCH,
      HAS_GIT: paths.HAS_GIT,
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`FEATURE_SPEC: ${paths.FEATURE_SPEC}`);
    console.log(`IMPL_PLAN: ${paths.IMPL_PLAN}`);
    console.log(`SPECS_DIR: ${paths.FEATURE_DIR}`);
    console.log(`BRANCH: ${paths.CURRENT_BRANCH}`);
    console.log(`HAS_GIT: ${paths.HAS_GIT}`);
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
