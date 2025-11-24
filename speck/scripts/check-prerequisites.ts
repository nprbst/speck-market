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

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
  skipFeatureCheck: boolean;
  skipPlanCheck: boolean;
  help: boolean;
  includeFileContents: boolean;
  includeWorkflowMode: boolean;
  validateCodeQuality: boolean;
}

/**
 * JSON output for paths-only mode
 */
interface PathsOnlyOutput {
  MODE: string;
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
export interface ValidationOutput {
  MODE: string;
  FEATURE_DIR: string;
  AVAILABLE_DOCS: string[];
  FILE_CONTENTS?: Record<string, string>;
  WORKFLOW_MODE?: string;
  // Multi-repo support: paths for writing implementation artifacts
  IMPL_PLAN?: string;
  TASKS?: string;
  REPO_ROOT?: string;
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
    skipFeatureCheck: args.includes("--skip-feature-check"),
    skipPlanCheck: args.includes("--skip-plan-check"),
    help: args.includes("--help") || args.includes("-h"),
    includeFileContents: args.includes("--include-file-contents"),
    includeWorkflowMode: args.includes("--include-workflow-mode"),
    validateCodeQuality: args.includes("--validate-code-quality"),
  };
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`Usage: check-prerequisites.ts [OPTIONS]

Consolidated prerequisite checking for Spec-Driven Development workflow.

OPTIONS:
  --json                   Output in JSON format
  --require-tasks          Require tasks.md to exist (for implementation phase)
  --include-tasks          Include tasks.md in AVAILABLE_DOCS list
  --paths-only             Only output path variables (no prerequisite validation)
  --skip-feature-check     Skip feature directory and plan.md validation (for /speck.specify)
  --skip-plan-check        Skip plan.md validation but check feature directory (for /speck.plan)
  --validate-code-quality  Validate TypeScript typecheck and ESLint (Constitution Principle IX)
  --include-file-contents  Include file contents in JSON output
  --include-workflow-mode  Include workflow mode in JSON output
  --help, -h               Show this help message

EXAMPLES:
  # Check task prerequisites (plan.md required)
  bun .speck/scripts/check-prerequisites.ts --json

  # Check implementation prerequisites (plan.md + tasks.md required)
  bun .speck/scripts/check-prerequisites.ts --json --require-tasks --include-tasks

  # Validate code quality before feature completion
  bun .speck/scripts/check-prerequisites.ts --validate-code-quality

  # Get feature paths only (no validation)
  bun .speck/scripts/check-prerequisites.ts --paths-only
`);
}

/**
 * Output paths only (no validation)
 */
function outputPathsOnly(paths: FeaturePaths, jsonMode: boolean): void {
  if (jsonMode) {
    const output: PathsOnlyOutput = {
      MODE: paths.MODE,
      REPO_ROOT: paths.REPO_ROOT,
      BRANCH: paths.CURRENT_BRANCH,
      FEATURE_DIR: paths.FEATURE_DIR,
      FEATURE_SPEC: paths.FEATURE_SPEC,
      IMPL_PLAN: paths.IMPL_PLAN,
      TASKS: paths.TASKS,
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`MODE: ${paths.MODE}`);
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
  const validOptions = [
    "--json",
    "--require-tasks",
    "--include-tasks",
    "--paths-only",
    "--skip-feature-check",
    "--skip-plan-check",
    "--help",
    "-h",
    "--include-file-contents",
    "--include-workflow-mode",
    "--validate-code-quality"
  ];
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
 * File size limits for pre-loading
 */
const FILE_SIZE_LIMITS = {
  maxSingleFile: 24 * 1024, // 24KB per file
  maxTotalFiles: 100 * 1024, // 100KB total
};

/**
 * Load file content with size checking
 *
 * @param filePath - Absolute path to file
 * @param totalSize - Running total of loaded file sizes
 * @returns File content or status indicator ("NOT_FOUND" or "TOO_LARGE")
 */
function loadFileContent(filePath: string, totalSize: { value: number }): string {
  if (!existsSync(filePath)) {
    return "NOT_FOUND";
  }

  try {
    const stats = Bun.file(filePath);
    const fileSize = stats.size;

    // Check single file size limit
    if (fileSize > FILE_SIZE_LIMITS.maxSingleFile) {
      return "TOO_LARGE";
    }

    // Check total size limit
    if (totalSize.value + fileSize > FILE_SIZE_LIMITS.maxTotalFiles) {
      return "TOO_LARGE";
    }

    // Read file content
    const content = readFileSync(filePath, "utf-8");
    totalSize.value += fileSize;
    return content;
  } catch (error) {
    return "NOT_FOUND";
  }
}

/**
 * Validate code quality (Constitution Principle IX)
 *
 * Runs typecheck and lint to ensure zero errors and warnings.
 * Returns error message if validation fails, null if passes.
 */
async function validateCodeQuality(repoRoot: string): Promise<{ passed: boolean; message: string }> {
  const { $ } = await import("bun");

  // Run typecheck
  const typecheckResult = await $`bun run typecheck`.cwd(repoRoot).nothrow().quiet();
  if (typecheckResult.exitCode !== 0) {
    return {
      passed: false,
      message: `❌ TypeScript validation failed (exit code ${typecheckResult.exitCode})\n${typecheckResult.stderr.toString()}`
    };
  }

  // Run lint
  const lintResult = await $`bun run lint`.cwd(repoRoot).nothrow().quiet();
  if (lintResult.exitCode !== 0) {
    const output = lintResult.stdout.toString();
    return {
      passed: false,
      message: `❌ ESLint validation failed (exit code ${lintResult.exitCode})\n${output}`
    };
  }

  return {
    passed: true,
    message: "✅ Code quality validation passed (0 typecheck errors, 0 lint errors/warnings)"
  };
}

/**
 * Determine workflow mode from plan.md, constitution.md, or default
 *
 * @param featureDir - Absolute path to feature directory
 * @param repoRoot - Absolute path to repository root
 * @returns Workflow mode: "stacked-pr" or "single-branch"
 */
function determineWorkflowMode(featureDir: string, repoRoot: string): string {
  // First, check plan.md
  const planPath = join(featureDir, "plan.md");
  if (existsSync(planPath)) {
    try {
      const planContent = readFileSync(planPath, "utf-8");
      const workflowMatch = planContent.match(/\*\*Workflow Mode\*\*:\s*(stacked-pr|single-branch)/);
      if (workflowMatch && workflowMatch[1]) {
        return workflowMatch[1];
      }
    } catch {
      // Continue to next fallback
    }
  }

  // Second, check constitution.md
  const constitutionPath = join(repoRoot, ".speck", "memory", "constitution.md");
  if (existsSync(constitutionPath)) {
    try {
      const constitutionContent = readFileSync(constitutionPath, "utf-8");
      const workflowMatch = constitutionContent.match(/\*\*Default Workflow Mode\*\*:\s*(stacked-pr|single-branch)/);
      if (workflowMatch && workflowMatch[1]) {
        return workflowMatch[1];
      }
    } catch {
      // Continue to default
    }
  }

  // Default
  return "single-branch";
}

/**
 * Main function
 */
export async function main(args: string[]): Promise<number> {
  // DEPRECATION WARNING: This individual script is deprecated
  // Prerequisite checks are now automatically performed by PrePromptSubmit hook
  // For manual checks, use: bun .speck/scripts/speck.ts env
  if (!args.includes("--json") && process.stdout.isTTY) {
    console.warn("\x1b[33m⚠️  DEPRECATION WARNING: Direct invocation deprecated. Prerequisites are now auto-checked via PrePromptSubmit hook.\x1b[0m\n");
  }

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

  // Skip branch validation if --skip-feature-check is set
  if (!options.skipFeatureCheck) {
    if (!(await checkFeatureBranch(paths.CURRENT_BRANCH, hasGitRepo, paths.REPO_ROOT))) {
      return ExitCode.USER_ERROR;
    }
  }

  // If paths-only mode OR skip-feature-check mode, output paths and exit
  if (options.pathsOnly || options.skipFeatureCheck) {
    outputPathsOnly(paths, options.json);
    return ExitCode.SUCCESS;
  }

  // Validate required directories and files
  if (!existsSync(paths.FEATURE_DIR)) {
    console.error(`ERROR: Feature directory not found: ${paths.FEATURE_DIR}`);
    console.error("Run /speck.specify first to create the feature structure.");
    return ExitCode.USER_ERROR;
  }

  // Check plan.md unless --skip-plan-check is set
  if (!options.skipPlanCheck && !existsSync(paths.IMPL_PLAN)) {
    console.error(`ERROR: plan.md not found in ${paths.FEATURE_DIR}`);
    console.error("Run /speck.plan first to create the implementation plan.");
    return ExitCode.USER_ERROR;
  }

  // Check for tasks.md if required
  if (options.requireTasks && !existsSync(paths.TASKS)) {
    console.error(`ERROR: tasks.md not found in ${paths.FEATURE_DIR}`);
    console.error("Run /speck.tasks first to create the task list.");
    return ExitCode.USER_ERROR;
  }

  // Build list of available documents (absolute paths)
  const docs: string[] = [];

  // Shared files (from root repo in multi-repo mode)
  if (existsSync(paths.FEATURE_SPEC)) {
    docs.push(paths.FEATURE_SPEC);
  }

  if (existsSync(paths.LINKED_REPOS)) {
    docs.push(paths.LINKED_REPOS);
  }

  // Check checklists directory (shared, from root repo)
  if (existsSync(paths.CHECKLISTS_DIR)) {
    try {
      const files = readdirSync(paths.CHECKLISTS_DIR);
      const mdFiles = files.filter(f => f.endsWith(".md"));
      // Add individual checklist files as absolute paths
      for (const file of mdFiles) {
        docs.push(join(paths.CHECKLISTS_DIR, file));
      }
    } catch {
      // Directory not readable, skip
    }
  }

  // Local files (from child repo in multi-repo mode)
  if (existsSync(paths.IMPL_PLAN)) {
    docs.push(paths.IMPL_PLAN);
  }

  if (existsSync(paths.RESEARCH)) {
    docs.push(paths.RESEARCH);
  }

  if (existsSync(paths.DATA_MODEL)) {
    docs.push(paths.DATA_MODEL);
  }

  if (existsSync(paths.QUICKSTART)) {
    docs.push(paths.QUICKSTART);
  }

  // Check contracts directory (local, from child repo)
  if (existsSync(paths.CONTRACTS_DIR)) {
    try {
      const files = readdirSync(paths.CONTRACTS_DIR);
      if (files.length > 0) {
        docs.push(paths.CONTRACTS_DIR);
      }
    } catch {
      // Directory not readable, skip
    }
  }

  // Include tasks.md if requested and it exists
  if (options.includeTasks && existsSync(paths.TASKS)) {
    docs.push(paths.TASKS);
  }

  // Load file contents if requested
  let fileContents: Record<string, string> | undefined;
  if (options.includeFileContents) {
    fileContents = {};
    const totalSize = { value: 0 };

    // High priority files (always attempt)
    fileContents["tasks.md"] = loadFileContent(paths.TASKS, totalSize);
    fileContents["plan.md"] = loadFileContent(paths.IMPL_PLAN, totalSize);
    fileContents["spec.md"] = loadFileContent(paths.FEATURE_SPEC, totalSize);

    // Medium priority files (always attempt)
    const constitutionPath = join(paths.REPO_ROOT, ".speck", "memory", "constitution.md");
    fileContents["constitution.md"] = loadFileContent(constitutionPath, totalSize);
    fileContents["data-model.md"] = loadFileContent(paths.DATA_MODEL, totalSize);
    fileContents["research.md"] = loadFileContent(paths.RESEARCH, totalSize);

    // Load checklist files (shared from root repo)
    if (existsSync(paths.CHECKLISTS_DIR)) {
      try {
        const checklistFiles = readdirSync(paths.CHECKLISTS_DIR).filter(f => f.endsWith(".md"));
        for (const file of checklistFiles) {
          const checklistPath = join(paths.CHECKLISTS_DIR, file);
          fileContents[`checklists/${file}`] = loadFileContent(checklistPath, totalSize);
        }
      } catch {
        // Directory not readable or error reading files, skip
      }
    }
  }

  // Determine workflow mode if requested
  let workflowMode: string | undefined;
  if (options.includeWorkflowMode) {
    workflowMode = determineWorkflowMode(paths.FEATURE_DIR, paths.REPO_ROOT);
  }

  // Validate code quality if requested (Constitution Principle IX)
  if (options.validateCodeQuality) {
    const qualityResult = await validateCodeQuality(paths.REPO_ROOT);
    if (!qualityResult.passed) {
      console.error("\n" + qualityResult.message);
      console.error("\nConstitution Principle IX requires zero typecheck errors and zero lint errors/warnings.");
      console.error("Fix all issues before marking the feature complete.\n");
      return ExitCode.USER_ERROR;
    }
    if (!options.json) {
      console.log("\n" + qualityResult.message + "\n");
    }
  }

  // Output results
  if (options.json) {
    const output: ValidationOutput = {
      MODE: paths.MODE,
      FEATURE_DIR: paths.FEATURE_DIR,
      AVAILABLE_DOCS: docs,
      ...(fileContents && { FILE_CONTENTS: fileContents }),
      ...(workflowMode && { WORKFLOW_MODE: workflowMode }),
      // Include implementation paths for multi-repo support
      IMPL_PLAN: paths.IMPL_PLAN,
      TASKS: paths.TASKS,
      REPO_ROOT: paths.REPO_ROOT,
    };
    console.log(JSON.stringify(output));
  } else{
    // Text output
    console.log(`FEATURE_DIR:${paths.FEATURE_DIR}`);
    console.log("AVAILABLE_DOCS:");

    // Show status of each potential document with absolute paths
    console.log(checkFile(paths.FEATURE_SPEC, paths.FEATURE_SPEC));
    console.log(checkFile(paths.LINKED_REPOS, paths.LINKED_REPOS));
    console.log(checkDir(paths.CHECKLISTS_DIR, paths.CHECKLISTS_DIR));
    console.log(checkFile(paths.IMPL_PLAN, paths.IMPL_PLAN));
    console.log(checkFile(paths.RESEARCH, paths.RESEARCH));
    console.log(checkFile(paths.DATA_MODEL, paths.DATA_MODEL));
    console.log(checkFile(paths.QUICKSTART, paths.QUICKSTART));
    console.log(checkDir(paths.CONTRACTS_DIR, paths.CONTRACTS_DIR));

    if (options.includeTasks) {
      console.log(checkFile(paths.TASKS, paths.TASKS));
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
