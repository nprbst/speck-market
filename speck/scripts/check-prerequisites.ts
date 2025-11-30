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

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename, relative } from "node:path";
import {
  getFeaturePaths,
  checkFeatureBranch,
  getTemplatesDir,
  type FeaturePaths,
} from "./common/paths";
import { ExitCode } from "./contracts/cli-interface";
import {
  formatJsonOutput,
  formatHookOutput,
  readHookInput,
  detectInputMode,
  detectOutputMode,
  type OutputMode,
} from "./lib/output-formatter";

/**
 * CLI options for check-prerequisites
 */
interface CheckPrerequisitesOptions {
  json: boolean;
  hook: boolean;
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
  TEMPLATES_DIR: string;
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
  // Template directory for loading spec/plan/tasks templates
  TEMPLATE_DIR?: string;
}

/**
 * Recursively collect all files from a directory
 *
 * @param dirPath - Directory to traverse
 * @param fileList - Accumulator for file paths
 * @returns Array of absolute file paths
 */
function collectAllFiles(dirPath: string, fileList: string[] = []): string[] {
  if (!existsSync(dirPath)) {
    return fileList;
  }

  try {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Recursively traverse subdirectories
          collectAllFiles(fullPath, fileList);
        } else if (stat.isFile()) {
          // Add file to list
          fileList.push(fullPath);
        }
      } catch {
        // Skip entries that can't be statted (broken symlinks, permission issues, etc.)
        continue;
      }
    }
  } catch {
    // Directory not readable, skip
  }

  return fileList;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CheckPrerequisitesOptions {
  return {
    json: args.includes("--json"),
    hook: args.includes("--hook"),
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
  --json                   Output in JSON format (structured JSON envelope)
  --hook                   Output hook-formatted response for Claude Code hooks
  --require-tasks          Require tasks.md to exist (for implementation phase)
  --include-tasks          Include tasks.md in AVAILABLE_DOCS list
  --paths-only             Only output path variables (no prerequisite validation)
  --skip-feature-check     Skip feature directory and plan.md validation (for /speck.specify)
  --skip-plan-check        Skip plan.md validation but check feature directory (for /speck.plan)
  --validate-code-quality  Validate TypeScript typecheck and ESLint (Constitution Principle IX)
  --include-file-contents  Include file contents in JSON output
  --include-workflow-mode  Include workflow mode in JSON output
  --help, -h               Show this help message

OUTPUT MODES:
  Default (human): Human-readable text output
  --json: Structured JSON with { ok, result, error, meta } envelope
  --hook: Hook output for Claude Code integration (context injection)

EXAMPLES:
  # Check task prerequisites (plan.md required)
  bun .speck/scripts/check-prerequisites.ts --json

  # Check implementation prerequisites (plan.md + tasks.md required)
  bun .speck/scripts/check-prerequisites.ts --json --require-tasks --include-tasks

  # For Claude Code hook integration
  bun .speck/scripts/check-prerequisites.ts --hook --include-workflow-mode

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
  const templatesDir = getTemplatesDir();
  if (jsonMode) {
    const output: PathsOnlyOutput = {
      MODE: paths.MODE,
      REPO_ROOT: paths.REPO_ROOT,
      BRANCH: paths.CURRENT_BRANCH,
      FEATURE_DIR: paths.FEATURE_DIR,
      FEATURE_SPEC: paths.FEATURE_SPEC,
      IMPL_PLAN: paths.IMPL_PLAN,
      TASKS: paths.TASKS,
      TEMPLATES_DIR: templatesDir,
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
    console.log(`TEMPLATES_DIR: ${templatesDir}`);
  }
}

/**
 * Check for unknown options
 */
function checkForUnknownOptions(args: string[], _outputMode: OutputMode): string | null {
  const validOptions = [
    "--json",
    "--hook",
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
        return `Unknown option '${arg}'. Use --help for usage information.`;
      }
    }
  }
  return null;
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
 * Output error in the appropriate format
 */
function outputError(
  code: string,
  message: string,
  recovery: string[],
  outputMode: OutputMode,
  startTime: number
): void {
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: false,
      error: { code, message, recovery },
      command: "check-prerequisites",
      startTime,
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    // For hook mode errors, output human-readable to stderr
    console.error(`ERROR: ${message}`);
    recovery.forEach(r => console.error(r));
  } else {
    console.error(`ERROR: ${message}`);
    recovery.forEach(r => console.error(r));
  }
}

/**
 * Main function
 */
export async function main(args: string[]): Promise<number> {
  const startTime = Date.now();
  const options = parseArgs(args);
  const outputMode = detectOutputMode(options);

  // DEPRECATION WARNING: This individual script is deprecated
  // Prerequisite checks are now automatically performed by PrePromptSubmit hook
  // For manual checks, use: bun .speck/scripts/speck.ts env
  if (outputMode === "human" && process.stdout.isTTY) {
    console.warn("\x1b[33m⚠️  DEPRECATION WARNING: Direct invocation deprecated. Prerequisites are now auto-checked via PrePromptSubmit hook.\x1b[0m\n");
  }

  // Check for unknown options first
  const unknownOptionError = checkForUnknownOptions(args, outputMode);
  if (unknownOptionError) {
    outputError("INVALID_ARGS", unknownOptionError, [], outputMode, startTime);
    return ExitCode.USER_ERROR;
  }

  if (options.help) {
    showHelp();
    return ExitCode.SUCCESS;
  }

  // Read hook input if in hook mode (for future use)
  if (detectInputMode(options) === "hook") {
    // Hook input can be read here for context-aware behavior
    await readHookInput();
  }

  // Get feature paths and validate branch
  const paths = await getFeaturePaths();
  const hasGitRepo = paths.HAS_GIT === "true";

  // Require git repository for all Speck operations
  if (!hasGitRepo) {
    outputError(
      "NO_GIT_REPO",
      "Not in a git repository",
      [
        "Speck requires a git repository to function.",
        "Initialize a git repository first: git init",
        "Or navigate to an existing git repository.",
      ],
      outputMode,
      startTime
    );
    return ExitCode.USER_ERROR;
  }

  // Skip branch validation if --skip-feature-check is set
  if (!options.skipFeatureCheck) {
    if (!(await checkFeatureBranch(paths.CURRENT_BRANCH, hasGitRepo, paths.REPO_ROOT))) {
      outputError(
        "NOT_ON_FEATURE_BRANCH",
        `Not on a feature branch: ${paths.CURRENT_BRANCH}`,
        ["Switch to a feature branch (e.g., git checkout 001-feature-name)"],
        outputMode,
        startTime
      );
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
    outputError(
      "FEATURE_DIR_NOT_FOUND",
      `Feature directory not found: ${paths.FEATURE_DIR}`,
      ["Run /speck.specify first to create the feature structure."],
      outputMode,
      startTime
    );
    return ExitCode.USER_ERROR;
  }

  // Check plan.md unless --skip-plan-check is set
  if (!options.skipPlanCheck && !existsSync(paths.IMPL_PLAN)) {
    outputError(
      "PLAN_NOT_FOUND",
      `plan.md not found in ${paths.FEATURE_DIR}`,
      ["Run /speck.plan first to create the implementation plan."],
      outputMode,
      startTime
    );
    return ExitCode.USER_ERROR;
  }

  // Check for tasks.md if required
  if (options.requireTasks && !existsSync(paths.TASKS)) {
    outputError(
      "TASKS_NOT_FOUND",
      `tasks.md not found in ${paths.FEATURE_DIR}`,
      ["Run /speck.tasks first to create the task list."],
      outputMode,
      startTime
    );
    return ExitCode.USER_ERROR;
  }

  // Build list of available documents (relative paths from REPO_ROOT)
  // Collect all files from both root repo feature dir and child repo feature dir
  const absoluteDocs: string[] = [];

  // 1. Collect all files from root repo feature directory (shared spec, checklists, etc.)
  const rootFeatureFiles = collectAllFiles(paths.FEATURE_DIR);
  absoluteDocs.push(...rootFeatureFiles);

  // 2. Add linked-repos.md from root repo .speck directory (if exists)
  const linkedReposPath = join(paths.SPECK_ROOT, ".speck", "linked-repos.md");
  if (existsSync(linkedReposPath)) {
    absoluteDocs.push(linkedReposPath);
  }

  // 3. Add constitution.md from root repo (if exists)
  const rootConstitutionPath = join(paths.SPECK_ROOT, ".speck", "memory", "constitution.md");
  if (existsSync(rootConstitutionPath)) {
    absoluteDocs.push(rootConstitutionPath);
  }

  // 4. Add constitution.md from child repo (if exists and different from root)
  const childConstitutionPath = join(paths.REPO_ROOT, ".speck", "memory", "constitution.md");
  if (childConstitutionPath !== rootConstitutionPath && existsSync(childConstitutionPath)) {
    absoluteDocs.push(childConstitutionPath);
  }

  // 5. Collect all files from child repo feature directory (plan, tasks, research, etc.)
  // In multi-repo mode, this is different from FEATURE_DIR
  // In single-repo mode, this is the same as FEATURE_DIR (so we'll dedupe)
  const featureName = basename(paths.FEATURE_DIR);
  const localFeatureDir = join(paths.REPO_ROOT, "specs", featureName);

  if (localFeatureDir !== paths.FEATURE_DIR) {
    // Multi-repo mode: collect files from child repo
    const localFeatureFiles = collectAllFiles(localFeatureDir);
    absoluteDocs.push(...localFeatureFiles);
  }

  // 6. Convert to relative paths (all relative to child's REPO_ROOT)
  // This will create paths like:
  // - "specs/001-feature/plan.md" for local files
  // - "../../8-specs/specs/001-feature/spec.md" for root repo files
  const relativeDocs = absoluteDocs.map(absolutePath => {
    return relative(paths.REPO_ROOT, absolutePath);
  });

  // 7. Filter out tasks.md unless --include-tasks is set
  const filteredDocs = options.includeTasks
    ? relativeDocs
    : relativeDocs.filter(filePath => !filePath.endsWith("tasks.md"));

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

  // Determine workflow mode (always include for hook mode, otherwise only if requested)
  let workflowMode: string | undefined;
  if (options.includeWorkflowMode || outputMode === "hook") {
    workflowMode = determineWorkflowMode(paths.FEATURE_DIR, paths.REPO_ROOT);
  }

  // Validate code quality if requested (Constitution Principle IX)
  if (options.validateCodeQuality) {
    const qualityResult = await validateCodeQuality(paths.REPO_ROOT);
    if (!qualityResult.passed) {
      outputError(
        "CODE_QUALITY_FAILED",
        qualityResult.message,
        ["Constitution Principle IX requires zero typecheck errors and zero lint errors/warnings.", "Fix all issues before marking the feature complete."],
        outputMode,
        startTime
      );
      return ExitCode.USER_ERROR;
    }
    if (outputMode === "human") {
      console.log("\n" + qualityResult.message + "\n");
    }
  }

  // Get templates directory (works in both dev and plugin contexts)
  const templateDir = getTemplatesDir();

  // Build the validation result data
  const validationData: ValidationOutput = {
    MODE: paths.MODE,
    FEATURE_DIR: paths.FEATURE_DIR,
    AVAILABLE_DOCS: filteredDocs,
    ...(fileContents && { FILE_CONTENTS: fileContents }),
    ...(workflowMode && { WORKFLOW_MODE: workflowMode }),
    // Include implementation paths for multi-repo support
    IMPL_PLAN: paths.IMPL_PLAN,
    TASKS: paths.TASKS,
    REPO_ROOT: paths.REPO_ROOT,
    // Include template directory for loading templates
    TEMPLATE_DIR: templateDir,
  };

  // Output results based on mode
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: true,
      data: validationData,
      command: "check-prerequisites",
      startTime,
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    // Hook mode: output context for Claude Code hook injection
    const hookContext = buildHookContext(validationData);
    const hookOutput = formatHookOutput({
      hookType: "UserPromptSubmit",
      context: hookContext,
    });
    console.log(JSON.stringify(hookOutput));
  } else {
    // Human-readable text output
    console.log(`FEATURE_DIR:${paths.FEATURE_DIR}`);
    console.log("AVAILABLE_DOCS:");

    // Show all discovered files
    for (const filePath of filteredDocs) {
      console.log(`  ✓ ${filePath}`);
    }
  }

  return ExitCode.SUCCESS;
}

/**
 * Build hook context string for Claude Code injection
 */
function buildHookContext(data: ValidationOutput): string {
  const lines = [
    "<!-- SPECK_PREREQ_CONTEXT",
    JSON.stringify({
      MODE: data.MODE,
      FEATURE_DIR: data.FEATURE_DIR,
      AVAILABLE_DOCS: data.AVAILABLE_DOCS,
      WORKFLOW_MODE: data.WORKFLOW_MODE,
      IMPL_PLAN: data.IMPL_PLAN,
      TASKS: data.TASKS,
      REPO_ROOT: data.REPO_ROOT,
      TEMPLATE_DIR: data.TEMPLATE_DIR,
    }),
    "-->",
  ];
  return lines.join("\n");
}

/**
 * Entry point
 */
if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
