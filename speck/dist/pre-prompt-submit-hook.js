#!/usr/bin/env bun
// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __require = import.meta.require;

// .speck/scripts/check-prerequisites.ts
import { existsSync as existsSync2, readdirSync as readdirSync2, readFileSync, statSync } from "fs";
import { join, basename, relative } from "path";

// .speck/scripts/common/paths.ts
import { existsSync } from "fs";
import { readdirSync } from "fs";
import fs from "fs/promises";
import path from "path";
var {$ } = globalThis.Bun;
async function getRepoRoot() {
  try {
    const result = await $`git rev-parse --show-toplevel`.quiet();
    return result.text().trim();
  } catch {
    return process.cwd();
  }
}
var cachedConfig = null;
async function detectSpeckRoot() {
  if (cachedConfig) {
    return cachedConfig;
  }
  const repoRoot = await getRepoRoot();
  let mainRepoRoot = repoRoot;
  const gitPath = path.join(repoRoot, ".git");
  try {
    const gitStats = await fs.stat(gitPath);
    if (gitStats.isFile()) {
      const gitContent = await fs.readFile(gitPath, "utf-8");
      const match = gitContent.match(/gitdir:\s*(.+)/);
      if (match && match[1]) {
        const gitDir = match[1].trim();
        const worktreesDir = path.dirname(gitDir);
        const gitDirPath = path.dirname(worktreesDir);
        mainRepoRoot = path.dirname(gitDirPath);
      }
    }
  } catch {}
  const symlinkPath = path.join(mainRepoRoot, ".speck", "root");
  try {
    const stats = await fs.lstat(symlinkPath);
    if (!stats.isSymbolicLink()) {
      console.warn(`WARNING: .speck/root exists but is not a symlink
` + `Expected: symlink to speck root directory
` + `Found: regular file/directory
` + `Falling back to single-repo mode.
` + "To enable multi-repo: mv .speck/root .speck/root.backup && /speck.link <path>");
      const config2 = {
        mode: "single-repo",
        speckRoot: repoRoot,
        repoRoot,
        specsDir: path.join(repoRoot, "specs")
      };
      cachedConfig = config2;
      return config2;
    }
    const speckRoot = await fs.realpath(symlinkPath);
    const dangerousPaths = ["/", "/etc", "/usr", "/bin", "/sbin", "/System", "/Library"];
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    if (dangerousPaths.some((dangerous) => speckRoot === dangerous || speckRoot.startsWith(dangerous + "/"))) {
      throw new Error(`Security: .speck/root symlink points to system directory: ${speckRoot}
` + `Speck root must be a user-owned project directory.
` + "Fix: rm .speck/root && /speck.link <safe-project-path>");
    }
    if (homeDir && speckRoot === path.dirname(homeDir)) {
      throw new Error(`Security: .speck/root symlink points above home directory: ${speckRoot}
` + "Fix: rm .speck/root && /speck.link <project-path-within-home>");
    }
    await fs.access(speckRoot);
    const config = {
      mode: "multi-repo",
      speckRoot,
      repoRoot,
      specsDir: path.join(speckRoot, "specs")
    };
    cachedConfig = config;
    return config;
  } catch (error) {
    const err = error;
    if (err.code === "ENOENT") {
      const childRepos = await findChildRepos(repoRoot);
      if (childRepos.length > 0) {
        const config2 = {
          mode: "multi-repo",
          speckRoot: repoRoot,
          repoRoot,
          specsDir: path.join(repoRoot, "specs")
        };
        cachedConfig = config2;
        return config2;
      }
      const config = {
        mode: "single-repo",
        speckRoot: repoRoot,
        repoRoot,
        specsDir: path.join(repoRoot, "specs")
      };
      cachedConfig = config;
      return config;
    }
    if (err.code === "ELOOP") {
      throw new Error(`Multi-repo configuration broken: .speck/root contains circular reference
` + "Fix: rm .speck/root && /speck.link <valid-path>");
    }
    const target = await fs.readlink(symlinkPath).catch(() => "unknown");
    throw new Error(`Multi-repo configuration broken: .speck/root \u2192 ${target} (does not exist)
` + `Fix:
` + `  1. Remove broken symlink: rm .speck/root
` + "  2. Link to correct location: /speck.link <path-to-speck-root>");
  }
}
async function findChildRepos(speckRoot) {
  const childRepos = [];
  try {
    const entries = await fs.readdir(speckRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink() && entry.name.startsWith(".speck-link-")) {
        const symlinkPath = path.join(speckRoot, entry.name);
        try {
          const targetPath = await fs.realpath(symlinkPath);
          const dangerousPaths = ["/", "/etc", "/usr", "/bin", "/sbin", "/System", "/Library"];
          if (dangerousPaths.some((dangerous) => targetPath === dangerous || targetPath.startsWith(dangerous + "/"))) {
            console.warn(`Security: Skipping ${entry.name} - points to system directory: ${targetPath}`);
            continue;
          }
          const gitDir = path.join(targetPath, ".git");
          try {
            await fs.access(gitDir);
            childRepos.push(targetPath);
          } catch {
            console.warn(`Warning: ${entry.name} points to non-git directory: ${targetPath}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Broken symlink ${entry.name}: ${errorMessage}`);
        }
      }
    }
  } catch (error) {
    const err = error;
    if (err.code !== "ENOENT") {
      throw error;
    }
  }
  return childRepos;
}
async function getCurrentBranch(repoRoot) {
  if (process.env.SPECIFY_FEATURE) {
    return process.env.SPECIFY_FEATURE;
  }
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`.quiet();
    return result.text().trim();
  } catch {
    const specsDir = path.join(repoRoot, "specs");
    if (existsSync(specsDir)) {
      let latestFeature = "";
      let highest = 0;
      const dirs = readdirSync(specsDir, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const match = dir.name.match(/^(\d{3})-/);
          if (match && match[1]) {
            const number = parseInt(match[1], 10);
            if (number > highest) {
              highest = number;
              latestFeature = dir.name;
            }
          }
        }
      }
      if (latestFeature) {
        return latestFeature;
      }
    }
    return "main";
  }
}
async function hasGit() {
  try {
    const cwd = process.cwd();
    const gitDir = path.join(cwd, ".git");
    if (existsSync(gitDir)) {
      return true;
    }
    await $`git rev-parse --show-toplevel`.quiet();
    return true;
  } catch {
    return false;
  }
}
async function checkFeatureBranch(branch, hasGitRepo, repoRoot) {
  if (!hasGitRepo) {
    console.error("[specify] Warning: Git repository not detected; skipped branch validation");
    return true;
  }
  const branchesFile = path.join(repoRoot, ".speck", "branches.json");
  if (existsSync(branchesFile)) {
    try {
      const content = await fs.readFile(branchesFile, "utf-8");
      const mapping = JSON.parse(content);
      if (mapping.branches && Array.isArray(mapping.branches)) {
        const branchExists = mapping.branches.some((b) => b.name === branch);
        if (branchExists) {
          return true;
        }
      }
    } catch {}
  }
  if (!/^\d{3}-/.test(branch)) {
    console.error(`ERROR: Not on a feature branch. Current branch: ${branch}`);
    console.error("Feature branches should be named like: 001-feature-name");
    return false;
  }
  return true;
}
async function findFeatureDirByPrefix(specsDir, branchName, repoRoot) {
  const branchesFile = path.join(repoRoot, ".speck", "branches.json");
  if (existsSync(branchesFile)) {
    try {
      const content = await fs.readFile(branchesFile, "utf-8");
      const mapping = JSON.parse(content);
      if (mapping.branches && Array.isArray(mapping.branches)) {
        const branch = mapping.branches.find((b) => b.name === branchName);
        if (branch && branch.specId) {
          return path.join(specsDir, branch.specId);
        }
      }
    } catch {}
  }
  const match = branchName.match(/^(\d{3})-/);
  if (!match) {
    return path.join(specsDir, branchName);
  }
  const prefix = match[1];
  const matches = [];
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory() && dir.name.startsWith(`${prefix}-`)) {
        matches.push(dir.name);
      }
    }
  }
  if (matches.length === 0) {
    return path.join(specsDir, branchName);
  } else if (matches.length === 1 && matches[0]) {
    return path.join(specsDir, matches[0]);
  } else {
    console.error(`ERROR: Multiple spec directories found with prefix '${prefix}': ${matches.join(", ")}`);
    console.error("Please ensure only one spec directory exists per numeric prefix.");
    return path.join(specsDir, branchName);
  }
}
async function getFeaturePaths() {
  const config = await detectSpeckRoot();
  const currentBranch = await getCurrentBranch(config.repoRoot);
  const hasGitRepo = await hasGit();
  const featureDir = await findFeatureDirByPrefix(config.specsDir, currentBranch, config.repoRoot);
  const featureName = path.basename(featureDir);
  const localSpecsDir = path.join(config.repoRoot, "specs", featureName);
  return {
    MODE: config.mode,
    SPECK_ROOT: config.speckRoot,
    SPECS_DIR: config.specsDir,
    REPO_ROOT: config.repoRoot,
    CURRENT_BRANCH: currentBranch,
    HAS_GIT: hasGitRepo ? "true" : "false",
    FEATURE_DIR: featureDir,
    FEATURE_SPEC: path.join(featureDir, "spec.md"),
    CHECKLISTS_DIR: path.join(featureDir, "checklists"),
    LINKED_REPOS: path.join(featureDir, "linked-repos.md"),
    IMPL_PLAN: path.join(localSpecsDir, "plan.md"),
    TASKS: path.join(localSpecsDir, "tasks.md"),
    RESEARCH: path.join(localSpecsDir, "research.md"),
    DATA_MODEL: path.join(localSpecsDir, "data-model.md"),
    QUICKSTART: path.join(localSpecsDir, "quickstart.md"),
    CONTRACTS_DIR: path.join(featureDir, "contracts")
  };
}

// .speck/scripts/lib/output-formatter.ts
function detectInputMode(options) {
  return options.hook ? "hook" : "default";
}
function detectOutputMode(options) {
  if (options.hook) {
    return "hook";
  }
  if (options.json) {
    return "json";
  }
  return "human";
}
async function readHookInput(stdinContent) {
  try {
    let content = stdinContent;
    if (content === undefined) {
      const stdin = Bun.stdin.stream();
      const reader = stdin.getReader();
      const readPromise = reader.read();
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ done: true, value: undefined }), 100));
      const result = await Promise.race([readPromise, timeoutPromise]);
      reader.releaseLock();
      if (result.done || !result.value) {
        return;
      }
      content = new TextDecoder().decode(result.value);
    }
    if (!content || content.trim() === "") {
      return;
    }
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    return;
  }
}
function formatJsonOutput(input) {
  const now = Date.now();
  const duration = input.startTime ? now - input.startTime : 0;
  const output = {
    ok: input.success,
    meta: {
      command: input.command,
      timestamp: new Date(now).toISOString(),
      duration_ms: duration
    }
  };
  if (input.success && input.data !== undefined) {
    output.result = input.data;
  }
  if (!input.success && input.error) {
    output.error = {
      code: input.error.code,
      message: input.error.message
    };
    if (input.error.recovery) {
      output.error.recovery = input.error.recovery;
    }
  }
  return output;
}
function formatHookOutput(input) {
  if (input.passthrough) {
    return {};
  }
  const output = {};
  if (input.hookType === "UserPromptSubmit" && input.context) {
    output.context = input.context;
  }
  if (input.hookType === "SessionStart" && input.additionalContext) {
    output.hookSpecificOutput = {
      additionalContext: input.additionalContext
    };
  }
  if (input.hookType === "PreToolUse") {
    if (input.allow !== undefined) {
      output.allow = input.allow;
    }
    if (input.message) {
      output.message = input.message;
    }
  }
  if (input.message && !output.message) {
    output.message = input.message;
  }
  return output;
}

// .speck/scripts/check-prerequisites.ts
function collectAllFiles(dirPath, fileList = []) {
  if (!existsSync2(dirPath)) {
    return fileList;
  }
  try {
    const entries = readdirSync2(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          collectAllFiles(fullPath, fileList);
        } else if (stat.isFile()) {
          fileList.push(fullPath);
        }
      } catch {
        continue;
      }
    }
  } catch {}
  return fileList;
}
function parseArgs(args) {
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
    validateCodeQuality: args.includes("--validate-code-quality")
  };
}
function showHelp() {
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
function outputPathsOnly(paths, jsonMode) {
  if (jsonMode) {
    const output = {
      MODE: paths.MODE,
      REPO_ROOT: paths.REPO_ROOT,
      BRANCH: paths.CURRENT_BRANCH,
      FEATURE_DIR: paths.FEATURE_DIR,
      FEATURE_SPEC: paths.FEATURE_SPEC,
      IMPL_PLAN: paths.IMPL_PLAN,
      TASKS: paths.TASKS
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
function checkForUnknownOptions(args, _outputMode) {
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
var FILE_SIZE_LIMITS = {
  maxSingleFile: 24 * 1024,
  maxTotalFiles: 100 * 1024
};
function loadFileContent(filePath, totalSize) {
  if (!existsSync2(filePath)) {
    return "NOT_FOUND";
  }
  try {
    const stats = Bun.file(filePath);
    const fileSize = stats.size;
    if (fileSize > FILE_SIZE_LIMITS.maxSingleFile) {
      return "TOO_LARGE";
    }
    if (totalSize.value + fileSize > FILE_SIZE_LIMITS.maxTotalFiles) {
      return "TOO_LARGE";
    }
    const content = readFileSync(filePath, "utf-8");
    totalSize.value += fileSize;
    return content;
  } catch (error) {
    return "NOT_FOUND";
  }
}
async function validateCodeQuality(repoRoot) {
  const { $: $2 } = await Promise.resolve(globalThis.Bun);
  const typecheckResult = await $2`bun run typecheck`.cwd(repoRoot).nothrow().quiet();
  if (typecheckResult.exitCode !== 0) {
    return {
      passed: false,
      message: `\u274C TypeScript validation failed (exit code ${typecheckResult.exitCode})
${typecheckResult.stderr.toString()}`
    };
  }
  const lintResult = await $2`bun run lint`.cwd(repoRoot).nothrow().quiet();
  if (lintResult.exitCode !== 0) {
    const output = lintResult.stdout.toString();
    return {
      passed: false,
      message: `\u274C ESLint validation failed (exit code ${lintResult.exitCode})
${output}`
    };
  }
  return {
    passed: true,
    message: "\u2705 Code quality validation passed (0 typecheck errors, 0 lint errors/warnings)"
  };
}
function determineWorkflowMode(featureDir, repoRoot) {
  const planPath = join(featureDir, "plan.md");
  if (existsSync2(planPath)) {
    try {
      const planContent = readFileSync(planPath, "utf-8");
      const workflowMatch = planContent.match(/\*\*Workflow Mode\*\*:\s*(stacked-pr|single-branch)/);
      if (workflowMatch && workflowMatch[1]) {
        return workflowMatch[1];
      }
    } catch {}
  }
  const constitutionPath = join(repoRoot, ".speck", "memory", "constitution.md");
  if (existsSync2(constitutionPath)) {
    try {
      const constitutionContent = readFileSync(constitutionPath, "utf-8");
      const workflowMatch = constitutionContent.match(/\*\*Default Workflow Mode\*\*:\s*(stacked-pr|single-branch)/);
      if (workflowMatch && workflowMatch[1]) {
        return workflowMatch[1];
      }
    } catch {}
  }
  return "single-branch";
}
function outputError(code, message, recovery, outputMode, startTime) {
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: false,
      error: { code, message, recovery },
      command: "check-prerequisites",
      startTime
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    console.error(`ERROR: ${message}`);
    recovery.forEach((r) => console.error(r));
  } else {
    console.error(`ERROR: ${message}`);
    recovery.forEach((r) => console.error(r));
  }
}
async function main(args) {
  const startTime = Date.now();
  const options = parseArgs(args);
  const outputMode = detectOutputMode(options);
  if (outputMode === "human" && process.stdout.isTTY) {
    console.warn(`\x1B[33m\u26A0\uFE0F  DEPRECATION WARNING: Direct invocation deprecated. Prerequisites are now auto-checked via PrePromptSubmit hook.\x1B[0m
`);
  }
  const unknownOptionError = checkForUnknownOptions(args, outputMode);
  if (unknownOptionError) {
    outputError("INVALID_ARGS", unknownOptionError, [], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  if (options.help) {
    showHelp();
    return 0 /* SUCCESS */;
  }
  if (detectInputMode(options) === "hook") {
    await readHookInput();
  }
  const paths = await getFeaturePaths();
  const hasGitRepo = paths.HAS_GIT === "true";
  if (!hasGitRepo) {
    outputError("NO_GIT_REPO", "Not in a git repository", [
      "Speck requires a git repository to function.",
      "Initialize a git repository first: git init",
      "Or navigate to an existing git repository."
    ], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  if (!options.skipFeatureCheck) {
    if (!await checkFeatureBranch(paths.CURRENT_BRANCH, hasGitRepo, paths.REPO_ROOT)) {
      outputError("NOT_ON_FEATURE_BRANCH", `Not on a feature branch: ${paths.CURRENT_BRANCH}`, ["Switch to a feature branch (e.g., git checkout 001-feature-name)"], outputMode, startTime);
      return 1 /* USER_ERROR */;
    }
  }
  if (options.pathsOnly || options.skipFeatureCheck) {
    outputPathsOnly(paths, options.json);
    return 0 /* SUCCESS */;
  }
  if (!existsSync2(paths.FEATURE_DIR)) {
    outputError("FEATURE_DIR_NOT_FOUND", `Feature directory not found: ${paths.FEATURE_DIR}`, ["Run /speck.specify first to create the feature structure."], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  if (!options.skipPlanCheck && !existsSync2(paths.IMPL_PLAN)) {
    outputError("PLAN_NOT_FOUND", `plan.md not found in ${paths.FEATURE_DIR}`, ["Run /speck.plan first to create the implementation plan."], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  if (options.requireTasks && !existsSync2(paths.TASKS)) {
    outputError("TASKS_NOT_FOUND", `tasks.md not found in ${paths.FEATURE_DIR}`, ["Run /speck.tasks first to create the task list."], outputMode, startTime);
    return 1 /* USER_ERROR */;
  }
  const absoluteDocs = [];
  const rootFeatureFiles = collectAllFiles(paths.FEATURE_DIR);
  absoluteDocs.push(...rootFeatureFiles);
  const linkedReposPath = join(paths.SPECK_ROOT, ".speck", "linked-repos.md");
  if (existsSync2(linkedReposPath)) {
    absoluteDocs.push(linkedReposPath);
  }
  const rootConstitutionPath = join(paths.SPECK_ROOT, ".speck", "memory", "constitution.md");
  if (existsSync2(rootConstitutionPath)) {
    absoluteDocs.push(rootConstitutionPath);
  }
  const childConstitutionPath = join(paths.REPO_ROOT, ".speck", "memory", "constitution.md");
  if (childConstitutionPath !== rootConstitutionPath && existsSync2(childConstitutionPath)) {
    absoluteDocs.push(childConstitutionPath);
  }
  const featureName = basename(paths.FEATURE_DIR);
  const localFeatureDir = join(paths.REPO_ROOT, "specs", featureName);
  if (localFeatureDir !== paths.FEATURE_DIR) {
    const localFeatureFiles = collectAllFiles(localFeatureDir);
    absoluteDocs.push(...localFeatureFiles);
  }
  const relativeDocs = absoluteDocs.map((absolutePath) => {
    return relative(paths.REPO_ROOT, absolutePath);
  });
  const filteredDocs = options.includeTasks ? relativeDocs : relativeDocs.filter((filePath) => !filePath.endsWith("tasks.md"));
  let fileContents;
  if (options.includeFileContents) {
    fileContents = {};
    const totalSize = { value: 0 };
    fileContents["tasks.md"] = loadFileContent(paths.TASKS, totalSize);
    fileContents["plan.md"] = loadFileContent(paths.IMPL_PLAN, totalSize);
    fileContents["spec.md"] = loadFileContent(paths.FEATURE_SPEC, totalSize);
    const constitutionPath = join(paths.REPO_ROOT, ".speck", "memory", "constitution.md");
    fileContents["constitution.md"] = loadFileContent(constitutionPath, totalSize);
    fileContents["data-model.md"] = loadFileContent(paths.DATA_MODEL, totalSize);
    fileContents["research.md"] = loadFileContent(paths.RESEARCH, totalSize);
    if (existsSync2(paths.CHECKLISTS_DIR)) {
      try {
        const checklistFiles = readdirSync2(paths.CHECKLISTS_DIR).filter((f) => f.endsWith(".md"));
        for (const file of checklistFiles) {
          const checklistPath = join(paths.CHECKLISTS_DIR, file);
          fileContents[`checklists/${file}`] = loadFileContent(checklistPath, totalSize);
        }
      } catch {}
    }
  }
  let workflowMode;
  if (options.includeWorkflowMode || outputMode === "hook") {
    workflowMode = determineWorkflowMode(paths.FEATURE_DIR, paths.REPO_ROOT);
  }
  if (options.validateCodeQuality) {
    const qualityResult = await validateCodeQuality(paths.REPO_ROOT);
    if (!qualityResult.passed) {
      outputError("CODE_QUALITY_FAILED", qualityResult.message, ["Constitution Principle IX requires zero typecheck errors and zero lint errors/warnings.", "Fix all issues before marking the feature complete."], outputMode, startTime);
      return 1 /* USER_ERROR */;
    }
    if (outputMode === "human") {
      console.log(`
` + qualityResult.message + `
`);
    }
  }
  const validationData = {
    MODE: paths.MODE,
    FEATURE_DIR: paths.FEATURE_DIR,
    AVAILABLE_DOCS: filteredDocs,
    ...fileContents && { FILE_CONTENTS: fileContents },
    ...workflowMode && { WORKFLOW_MODE: workflowMode },
    IMPL_PLAN: paths.IMPL_PLAN,
    TASKS: paths.TASKS,
    REPO_ROOT: paths.REPO_ROOT
  };
  if (outputMode === "json") {
    const output = formatJsonOutput({
      success: true,
      data: validationData,
      command: "check-prerequisites",
      startTime
    });
    console.log(JSON.stringify(output));
  } else if (outputMode === "hook") {
    const hookContext = buildHookContext(validationData);
    const hookOutput = formatHookOutput({
      hookType: "UserPromptSubmit",
      context: hookContext
    });
    console.log(JSON.stringify(hookOutput));
  } else {
    console.log(`FEATURE_DIR:${paths.FEATURE_DIR}`);
    console.log("AVAILABLE_DOCS:");
    for (const filePath of filteredDocs) {
      console.log(`  \u2713 ${filePath}`);
    }
  }
  return 0 /* SUCCESS */;
}
function buildHookContext(data) {
  const lines = [
    "<!-- SPECK_PREREQ_CONTEXT",
    JSON.stringify({
      MODE: data.MODE,
      FEATURE_DIR: data.FEATURE_DIR,
      AVAILABLE_DOCS: data.AVAILABLE_DOCS,
      WORKFLOW_MODE: data.WORKFLOW_MODE,
      IMPL_PLAN: data.IMPL_PLAN,
      TASKS: data.TASKS,
      REPO_ROOT: data.REPO_ROOT
    }),
    "-->"
  ];
  return lines.join(`
`);
}
if (false) {}

// .speck/scripts/lib/prereq-cache.ts
var CACHE_TTL_MS = 5000;
var cachedResult = null;
function getCachedResult() {
  if (!cachedResult) {
    return null;
  }
  const now = Date.now();
  const age = now - cachedResult.timestamp;
  if (age > CACHE_TTL_MS) {
    cachedResult = null;
    return null;
  }
  return cachedResult;
}
function cacheResult(result) {
  cachedResult = result;
}

// .speck/scripts/lib/prereq-runner.ts
async function captureOutput(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  let stdout = "";
  let stderr = "";
  console.log = (...args) => {
    stdout += args.join(" ") + `
`;
  };
  console.error = (...args) => {
    stderr += args.join(" ") + `
`;
  };
  try {
    const exitCode = await fn();
    return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    stderr += `Error: ${err.message}
`;
    return { exitCode: 2, stdout: stdout.trim(), stderr: stderr.trim() };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}
async function runPrerequisiteCheck(options = {}, useCache = true) {
  if (useCache) {
    const cached = getCachedResult();
    if (cached) {
      return {
        success: cached.success,
        output: cached.output,
        error: cached.error,
        cached: true
      };
    }
  }
  try {
    const args = ["--json"];
    if (options.requireTasks)
      args.push("--require-tasks");
    if (options.includeTasks)
      args.push("--include-tasks");
    if (options.skipFeatureCheck)
      args.push("--skip-feature-check");
    if (options.skipPlanCheck)
      args.push("--skip-plan-check");
    if (options.includeFileContents)
      args.push("--include-file-contents");
    if (options.includeWorkflowMode)
      args.push("--include-workflow-mode");
    const { exitCode, stdout, stderr } = await captureOutput(() => main(args));
    if (exitCode === 0) {
      try {
        const output = JSON.parse(stdout);
        const result = {
          success: true,
          output,
          error: null,
          cached: false
        };
        cacheResult({
          success: true,
          output,
          error: null,
          timestamp: Date.now()
        });
        return result;
      } catch (parseError) {
        const err = parseError instanceof Error ? parseError : new Error(String(parseError));
        const error = `Failed to parse check-prerequisites output: ${err.message}`;
        const result = {
          success: false,
          output: null,
          error,
          cached: false
        };
        cacheResult({
          success: false,
          output: null,
          error,
          timestamp: Date.now()
        });
        return result;
      }
    } else {
      const error = stderr || `check-prerequisites exited with code ${exitCode}`;
      const result = {
        success: false,
        output: null,
        error,
        cached: false
      };
      cacheResult({
        success: false,
        output: null,
        error,
        timestamp: Date.now()
      });
      return result;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const errorMsg = `Failed to run check-prerequisites: ${err.message}`;
    const result = {
      success: false,
      output: null,
      error: errorMsg,
      cached: false
    };
    cacheResult({
      success: false,
      output: null,
      error: errorMsg,
      timestamp: Date.now()
    });
    return result;
  }
}
function formatPrereqContext(result) {
  if (!result.success || !result.output) {
    return "";
  }
  const { FEATURE_DIR, AVAILABLE_DOCS, MODE, WORKFLOW_MODE, IMPL_PLAN, TASKS, REPO_ROOT } = result.output;
  const contextData = {
    MODE,
    FEATURE_DIR,
    AVAILABLE_DOCS
  };
  if (WORKFLOW_MODE) {
    contextData.WORKFLOW_MODE = WORKFLOW_MODE;
  }
  if (IMPL_PLAN) {
    contextData.IMPL_PLAN = IMPL_PLAN;
  }
  if (TASKS) {
    contextData.TASKS = TASKS;
  }
  if (REPO_ROOT) {
    contextData.REPO_ROOT = REPO_ROOT;
  }
  return `<!-- SPECK_PREREQ_CONTEXT
${JSON.stringify(contextData)}
-->`;
}
function formatPrereqError(error) {
  return `\u26A0\uFE0F **Prerequisite Check Failed**

${error}

Please ensure you're on a valid feature branch and have run the necessary Speck commands.
`.trim();
}

// .speck/scripts/hooks/pre-prompt-submit.ts
import { appendFile } from "fs/promises";
var LOG_FILE = "/private/tmp/.claude-hook-test/speck-hook-log.txt";
var log = async (msg) => {
  await appendFile(LOG_FILE, `[${new Date().toISOString()}] [PrePromptSubmit] ${msg}
`);
};
function isSpeckSlashCommand(prompt) {
  return /^\/speck[.:]/.test(prompt.trim());
}
function getCheckOptions(prompt) {
  const match = prompt.match(/^\/speck[.:](\w+)/);
  const command = match?.[1] ?? "";
  const requireTasksCommands = ["implement"];
  const includeTasksCommands = ["implement", "analyze"];
  const skipFeatureCheckCommands = ["specify", "constitution", "env", "link", "init"];
  const skipPlanCheckCommands = ["plan", "clarify", "constitution", "env", "link", "init"];
  const includeFileContentsCommands = [
    "implement",
    "analyze",
    "plan",
    "tasks",
    "checklist",
    "clarify"
  ];
  const includeWorkflowModeCommands = ["implement"];
  return {
    requireTasks: requireTasksCommands.includes(command),
    includeTasks: includeTasksCommands.includes(command),
    skipFeatureCheck: skipFeatureCheckCommands.includes(command),
    skipPlanCheck: skipPlanCheckCommands.includes(command),
    includeFileContents: includeFileContentsCommands.includes(command),
    includeWorkflowMode: includeWorkflowModeCommands.includes(command)
  };
}
async function main2() {
  try {
    const input = await Bun.stdin.text();
    await log(`Received hook input (length: ${input.length})`);
    const hookInput = JSON.parse(input);
    const { prompt } = hookInput;
    await log(`Parsed prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? "..." : ""}`);
    if (!isSpeckSlashCommand(prompt)) {
      await log(`Not a /speck.* command, passing through`);
      console.log(JSON.stringify({}));
      return;
    }
    const commandMatch = prompt.match(/^\/speck[.:]\w+/);
    await log(`Detected /speck.* command: ${commandMatch?.[0] ?? "unknown"}`);
    const options = getCheckOptions(prompt);
    await log(`Check options: ${JSON.stringify(options)}`);
    const result = await runPrerequisiteCheck(options, true);
    await log(`Prerequisite check result: success=${result.success}`);
    if (result.success && result.output) {
      const context = formatPrereqContext(result);
      await log(`Formatted context (length: ${context.length})`);
      await log(`Context preview: ${context.substring(0, 200)}`);
      const output = {
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: context
        }
      };
      await log(`Returning success with additionalContext`);
      console.log(JSON.stringify(output));
    } else {
      const errorMessage = formatPrereqError(result.error || "Unknown error");
      await log(`Blocking with error: ${result.error}`);
      const output = {
        decision: "block",
        reason: errorMessage,
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit"
        }
      };
      console.log(JSON.stringify(output));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await log(`Hook error: ${errorMessage}`);
    console.error(`PrePromptSubmit hook error: ${errorMessage}`);
    console.log(JSON.stringify({}));
  }
}
main2();
