/**
 * Prerequisite Check Runner
 *
 * Provides functions to run check-prerequisites and cache results
 * for use in PrePromptSubmit hooks.
 *
 * Uses static imports and direct function calls (no subprocess spawning)
 * for efficient bundling and performance.
 *
 * @module prereq-runner
 */

import { main as checkPrerequisites } from "../check-prerequisites";
import type { ValidationOutput } from "../check-prerequisites";
import { getCachedResult, cacheResult } from "./prereq-cache";

/**
 * Result of running prerequisite checks
 */
export interface PrereqCheckResult {
  success: boolean;
  output: ValidationOutput | null;
  error: string | null;
  cached: boolean;
}

/**
 * Capture stdout/stderr during prerequisite check
 */
async function captureOutput(fn: () => Promise<number>): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const originalLog = console.log;
  const originalError = console.error;
  let stdout = "";
  let stderr = "";

  console.log = (...args): void => {
    stdout += args.join(" ") + "\n";
  };

  console.error = (...args): void => {
    stderr += args.join(" ") + "\n";
  };

  try {
    const exitCode = await fn();
    return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    stderr += `Error: ${err.message}\n`;
    return { exitCode: 2, stdout: stdout.trim(), stderr: stderr.trim() };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

/**
 * Run prerequisite checks and return structured result
 *
 * @param options - Command options to pass to check-prerequisites
 * @param useCache - Whether to use cached results (default: true)
 * @returns Promise resolving to check result
 */
export async function runPrerequisiteCheck(
  options: {
    requireTasks?: boolean;
    includeTasks?: boolean;
    skipFeatureCheck?: boolean;
    skipPlanCheck?: boolean;
    includeFileContents?: boolean;
    includeWorkflowMode?: boolean;
  } = {},
  useCache = true
): Promise<PrereqCheckResult> {
  // Check cache first
  if (useCache) {
    const cached = getCachedResult();
    if (cached) {
      return {
        success: cached.success,
        output: cached.output,
        error: cached.error,
        cached: true,
      };
    }
  }

  try {
    // Build command arguments
    const args = ["--json"];
    if (options.requireTasks) args.push("--require-tasks");
    if (options.includeTasks) args.push("--include-tasks");
    if (options.skipFeatureCheck) args.push("--skip-feature-check");
    if (options.skipPlanCheck) args.push("--skip-plan-check");
    if (options.includeFileContents) args.push("--include-file-contents");
    if (options.includeWorkflowMode) args.push("--include-workflow-mode");

    // Execute check-prerequisites directly (no subprocess)
    const { exitCode, stdout, stderr } = await captureOutput(() =>
      checkPrerequisites(args)
    );

    if (exitCode === 0) {
      // Parse JSON output
      try {
        const output = JSON.parse(stdout) as ValidationOutput;
        const result: PrereqCheckResult = {
          success: true,
          output,
          error: null,
          cached: false,
        };

        // Cache successful result
        cacheResult({
          success: true,
          output,
          error: null,
          timestamp: Date.now(),
        });

        return result;
      } catch (parseError) {
        const err = parseError instanceof Error ? parseError : new Error(String(parseError));
        const error = `Failed to parse check-prerequisites output: ${err.message}`;

        const result: PrereqCheckResult = {
          success: false,
          output: null,
          error,
          cached: false,
        };

        // Cache failed result
        cacheResult({
          success: false,
          output: null,
          error,
          timestamp: Date.now(),
        });

        return result;
      }
    } else {
      // Check failed - capture stderr
      const error = stderr || `check-prerequisites exited with code ${exitCode}`;

      const result: PrereqCheckResult = {
        success: false,
        output: null,
        error,
        cached: false,
      };

      // Cache failed result
      cacheResult({
        success: false,
        output: null,
        error,
        timestamp: Date.now(),
      });

      return result;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const errorMsg = `Failed to run check-prerequisites: ${err.message}`;

    const result: PrereqCheckResult = {
      success: false,
      output: null,
      error: errorMsg,
      cached: false,
    };

    // Cache failed result
    cacheResult({
      success: false,
      output: null,
      error: errorMsg,
      timestamp: Date.now(),
    });

    return result;
  }
}

/**
 * Format prerequisite check result as markdown context for prompt injection
 *
 * Formats as HTML comment with JSON payload matching the expected format:
 * <!-- SPECK_PREREQ_CONTEXT
 * {"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-feature","AVAILABLE_DOCS":["spec.md"]}
 * -->
 *
 * @param result - The check result to format
 * @returns Markdown string to inject into prompt
 */
export function formatPrereqContext(result: PrereqCheckResult): string {
  if (!result.success || !result.output) {
    return "";
  }

  const { FEATURE_DIR, AVAILABLE_DOCS, MODE, WORKFLOW_MODE, IMPL_PLAN, TASKS, REPO_ROOT } = result.output;

  const contextData: Record<string, unknown> = {
    MODE,
    FEATURE_DIR,
    AVAILABLE_DOCS,
  };

  // Add optional fields if present
  // TEMPORARILY DISABLED: FILE_CONTENTS bloats context
  // if (FILE_CONTENTS) {
  //   contextData.FILE_CONTENTS = FILE_CONTENTS;
  // }
  if (WORKFLOW_MODE) {
    contextData.WORKFLOW_MODE = WORKFLOW_MODE;
  }
  // Add implementation paths for multi-repo support
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

/**
 * Format prerequisite check error as user-friendly message
 *
 * @param error - The error message from check
 * @returns User-friendly error message
 */
export function formatPrereqError(error: string): string {
  return `⚠️ **Prerequisite Check Failed**

${error}

Please ensure you're on a valid feature branch and have run the necessary Speck commands.
`.trim();
}
