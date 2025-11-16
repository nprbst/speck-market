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
import {
  getFeaturePaths,
  checkFeatureBranch,
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
async function main(args: string[]): Promise<number> {
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return ExitCode.SUCCESS;
  }

  // Get all paths and variables from common functions
  const paths = await getFeaturePaths();
  const hasGitRepo = paths.HAS_GIT === "true";

  // Check if we're on a proper feature branch (only for git repos)
  if (!checkFeatureBranch(paths.CURRENT_BRANCH, hasGitRepo)) {
    return ExitCode.USER_ERROR;
  }

  // Ensure the feature directory exists
  mkdirSync(paths.FEATURE_DIR, { recursive: true });

  // Copy plan template if it exists
  const template = path.join(paths.REPO_ROOT, ".specify/templates/plan-template.md");
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
