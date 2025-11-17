#!/usr/bin/env bun

/**
 * Check Prerequisites Script
 *
 * Bun TypeScript implementation of check-prerequisites.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.85/.specify/scripts/bash/check-prerequisites.sh
 * Strategy: Pure TypeScript (file I/O, JSON) + imports from common/paths.ts
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" to cd command for SCRIPT_DIR (security fix)
 * - TypeScript implementation already immune: uses import.meta.dir instead of cd
 * - No code changes needed, only documentation updated to track v0.0.85
 *
 * CLI Interface:
 * - Flags: --json, --require-tasks, --include-tasks, --paths-only, --help
 * - Exit Codes: 0 (success), 1 (user error), 2 (system error)
 * - JSON Output (paths-only): { REPO_ROOT, BRANCH, FEATURE_DIR, FEATURE_SPEC, IMPL_PLAN, TASKS }
 * - JSON Output (validation): { FEATURE_DIR, AVAILABLE_DOCS }
 *
 * Transformation Rationale:
 * - Replaced bash file existence checks with Node.js fs.existsSync()
 * - Replaced eval/source pattern with TypeScript imports
 * - Replaced bash string manipulation with native TypeScript
 * - Preserved all CLI flags and exit codes exactly
 */

import { existsSync, readdirSync } from "node:fs";
import {
  getFeaturePaths,
  checkFeatureBranch,
  checkFile,
  checkDir,
  type FeaturePaths,
} from "./common/paths";
import { ExitCode } from "./contracts/cli-interface";

/**
 * CLI options for check-prerequisites
 */
interface CheckPrerequisitesOptions {
  json: boolean;
  requireTasks: boolean;
  includeTasks: boolean;
  pathsOnly: boolean;
  help: boolean;
}

/**
 * JSON output for paths-only mode
 */
interface PathsOnlyOutput {
  REPO_ROOT: string;
  BRANCH: string;
  FEATURE_DIR: string;
  FEATURE_SPEC: string;
  IMPL_PLAN: string;
  TASKS: string;
}

/**
 * JSON output for validation mode
 */
interface ValidationOutput {
  FEATURE_DIR: string;
  AVAILABLE_DOCS: string[];
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CheckPrerequisitesOptions {
  return {
    json: args.includes("--json"),
    requireTasks: args.includes("--require-tasks"),
    includeTasks: args.includes("--include-tasks"),
    pathsOnly: args.includes("--paths-only"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`Usage: check-prerequisites.sh [OPTIONS]

Consolidated prerequisite checking for Spec-Driven Development workflow.

OPTIONS:
  --json              Output in JSON format
  --require-tasks     Require tasks.md to exist (for implementation phase)
  --include-tasks     Include tasks.md in AVAILABLE_DOCS list
  --paths-only        Only output path variables (no prerequisite validation)
  --help, -h          Show this help message

EXAMPLES:
  # Check task prerequisites (plan.md required)
  ./check-prerequisites.sh --json

  # Check implementation prerequisites (plan.md + tasks.md required)
  ./check-prerequisites.sh --json --require-tasks --include-tasks

  # Get feature paths only (no validation)
  ./check-prerequisites.sh --paths-only
`);
}

/**
 * Output paths only (no validation)
 */
function outputPathsOnly(paths: FeaturePaths, jsonMode: boolean): void {
  if (jsonMode) {
    const output: PathsOnlyOutput = {
      REPO_ROOT: paths.REPO_ROOT,
      BRANCH: paths.CURRENT_BRANCH,
      FEATURE_DIR: paths.FEATURE_DIR,
      FEATURE_SPEC: paths.FEATURE_SPEC,
      IMPL_PLAN: paths.IMPL_PLAN,
      TASKS: paths.TASKS,
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`REPO_ROOT: ${paths.REPO_ROOT}`);
    console.log(`BRANCH: ${paths.CURRENT_BRANCH}`);
    console.log(`FEATURE_DIR: ${paths.FEATURE_DIR}`);
    console.log(`FEATURE_SPEC: ${paths.FEATURE_SPEC}`);
    console.log(`IMPL_PLAN: ${paths.IMPL_PLAN}`);
    console.log(`TASKS: ${paths.TASKS}`);
  }
}

/**
 * Check for unknown options
 */
function checkForUnknownOptions(args: string[]): void {
  const validOptions = ["--json", "--require-tasks", "--include-tasks", "--paths-only", "--help", "-h"];
  for (const arg of args) {
    if (arg.startsWith("--") || arg.startsWith("-")) {
      if (!validOptions.includes(arg)) {
        console.error(`ERROR: Unknown option '${arg}'. Use --help for usage information.`);
        process.exit(ExitCode.USER_ERROR);
      }
    }
  }
}

/**
 * Main function
 */
async function main(args: string[]): Promise<number> {
  // Check for unknown options first
  checkForUnknownOptions(args);

  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return ExitCode.SUCCESS;
  }

  // Get feature paths and validate branch
  const paths = await getFeaturePaths();
  const hasGitRepo = paths.HAS_GIT === "true";

  if (!checkFeatureBranch(paths.CURRENT_BRANCH, hasGitRepo)) {
    return ExitCode.USER_ERROR;
  }

  // If paths-only mode, output paths and exit
  if (options.pathsOnly) {
    outputPathsOnly(paths, options.json);
    return ExitCode.SUCCESS;
  }

  // Validate required directories and files
  if (!existsSync(paths.FEATURE_DIR)) {
    console.error(`ERROR: Feature directory not found: ${paths.FEATURE_DIR}`);
    console.error("Run /speckit.specify first to create the feature structure.");
    return ExitCode.USER_ERROR;
  }

  if (!existsSync(paths.IMPL_PLAN)) {
    console.error(`ERROR: plan.md not found in ${paths.FEATURE_DIR}`);
    console.error("Run /speckit.plan first to create the implementation plan.");
    return ExitCode.USER_ERROR;
  }

  // Check for tasks.md if required
  if (options.requireTasks && !existsSync(paths.TASKS)) {
    console.error(`ERROR: tasks.md not found in ${paths.FEATURE_DIR}`);
    console.error("Run /speckit.tasks first to create the task list.");
    return ExitCode.USER_ERROR;
  }

  // Build list of available documents
  const docs: string[] = [];

  // Always check these optional docs
  if (existsSync(paths.RESEARCH)) {
    docs.push("research.md");
  }

  if (existsSync(paths.DATA_MODEL)) {
    docs.push("data-model.md");
  }

  // Check contracts directory (only if it exists and has files)
  if (existsSync(paths.CONTRACTS_DIR)) {
    try {
      const files = readdirSync(paths.CONTRACTS_DIR);
      if (files.length > 0) {
        docs.push("contracts/");
      }
    } catch {
      // Directory not readable, skip
    }
  }

  if (existsSync(paths.QUICKSTART)) {
    docs.push("quickstart.md");
  }

  // Include tasks.md if requested and it exists
  if (options.includeTasks && existsSync(paths.TASKS)) {
    docs.push("tasks.md");
  }

  // Output results
  if (options.json) {
    const output: ValidationOutput = {
      FEATURE_DIR: paths.FEATURE_DIR,
      AVAILABLE_DOCS: docs,
    };
    console.log(JSON.stringify(output));
  } else {
    // Text output
    console.log(`FEATURE_DIR:${paths.FEATURE_DIR}`);
    console.log("AVAILABLE_DOCS:");

    // Show status of each potential document
    console.log(checkFile(paths.RESEARCH, "research.md"));
    console.log(checkFile(paths.DATA_MODEL, "data-model.md"));
    console.log(checkDir(paths.CONTRACTS_DIR, "contracts/"));
    console.log(checkFile(paths.QUICKSTART, "quickstart.md"));

    if (options.includeTasks) {
      console.log(checkFile(paths.TASKS, "tasks.md"));
    }
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
