/**
 * Output formatting utilities for dual-mode CLI operation
 *
 * Provides consistent output formatting across CLI and hook modes.
 * Implements the contracts defined in:
 *   specs/015-scope-simplification/contracts/cli-interface.ts
 *
 * Feature: 015-scope-simplification
 * Tasks: T033, T033a, T033b, T034, T035
 */

import type { CommandResult, ExecutionMode } from "./types";

// =============================================================================
// Types from cli-interface.ts contract
// =============================================================================

/**
 * Output mode for CLI commands
 * - "human": Human-readable terminal output (default)
 * - "json": Structured JSON for LLM parsing
 * - "hook": Hook-formatted output for Claude Code hooks
 */
export type OutputMode = "human" | "json" | "hook";

/**
 * Input mode for CLI commands
 * - "default": Standard CLI invocation (args from command line only)
 * - "hook": Hook invocation (JSON payload from stdin + command line args)
 */
export type InputMode = "default" | "hook";

/**
 * Hook input payload structure (read from stdin when --hook flag present)
 */
export interface HookInputPayload {
  hookType?: "UserPromptSubmit" | "PreToolUse" | "PostToolUse" | "SessionStart";
  toolName?: string;
  toolInput?: Record<string, unknown>;
  userPrompt?: string;
  sessionContext?: {
    workingDirectory: string;
    conversationId?: string;
    isInteractive?: boolean;
  };
}

/**
 * Hook output format for Claude Code integration
 */
export interface HookOutput {
  context?: string;
  allow?: boolean;
  message?: string;
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

/**
 * Standard JSON output envelope
 */
export interface JsonOutput<T = unknown> {
  ok: boolean;
  result?: T;
  error?: {
    code: string;
    message: string;
    recovery?: string[];
  };
  meta: {
    command: string;
    timestamp: string;
    duration_ms: number;
  };
}

// =============================================================================
// Input Mode Detection & Parsing (T033a, T033b)
// =============================================================================

/**
 * Detect input mode from CLI options
 *
 * @param options - CLI options object with optional hook flag
 * @returns InputMode - "hook" if --hook flag is present, "default" otherwise
 */
export function detectInputMode(options: { hook?: boolean }): InputMode {
  return options.hook ? "hook" : "default";
}

/**
 * Detect output mode from CLI options
 *
 * Per FR-009: --hook takes precedence over --json
 *
 * @param options - CLI options object with optional json and hook flags
 * @returns OutputMode - "hook" > "json" > "human"
 */
export function detectOutputMode(options: { json?: boolean; hook?: boolean }): OutputMode {
  if (options.hook) {
    return "hook";
  }
  if (options.json) {
    return "json";
  }
  return "human";
}

/**
 * Read and parse hook input from stdin
 *
 * When --hook flag is present, CLI reads JSON payload from stdin containing
 * hook context (tool name, tool input, user prompt, session context).
 *
 * @param stdinContent - Raw stdin content (or string for testing)
 * @returns Parsed HookInputPayload or undefined if invalid/empty
 */
export async function readHookInput(stdinContent?: string): Promise<HookInputPayload | undefined> {
  try {
    let content = stdinContent;

    // If no content provided, read from stdin (for production use)
    if (content === undefined) {
      // Check if stdin has data available (non-blocking)
      const stdin = Bun.stdin.stream();
      const reader = stdin.getReader();

      // Try to read with a short timeout
      const readPromise = reader.read();
      const timeoutPromise = new Promise<{ done: true; value: undefined }>((resolve) =>
        setTimeout(() => resolve({ done: true, value: undefined }), 100)
      );

      const result = await Promise.race([readPromise, timeoutPromise]);
      reader.releaseLock();

      if (result.done || !result.value) {
        return undefined;
      }

      content = new TextDecoder().decode(result.value);
    }

    // Empty content
    if (!content || content.trim() === "") {
      return undefined;
    }

    // Parse JSON
    const parsed = JSON.parse(content) as HookInputPayload;
    return parsed;
  } catch {
    // Invalid JSON or read error
    return undefined;
  }
}

// =============================================================================
// JSON Output Formatting (T034)
// =============================================================================

/**
 * Format input for formatJsonOutput function
 */
export interface FormatJsonInput<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    recovery?: string[];
  };
  command: string;
  startTime?: number;
}

/**
 * Format command result as standard JSON output
 *
 * Implements the JsonOutput contract from cli-interface.ts
 *
 * @param input - Format input with success, data/error, command, and optional startTime
 * @returns JsonOutput structure
 */
export function formatJsonOutput<T = unknown>(input: FormatJsonInput<T>): JsonOutput<T> {
  const now = Date.now();
  const duration = input.startTime ? now - input.startTime : 0;

  const output: JsonOutput<T> = {
    ok: input.success,
    meta: {
      command: input.command,
      timestamp: new Date(now).toISOString(),
      duration_ms: duration,
    },
  };

  if (input.success && input.data !== undefined) {
    output.result = input.data;
  }

  if (!input.success && input.error) {
    output.error = {
      code: input.error.code,
      message: input.error.message,
    };
    if (input.error.recovery) {
      output.error.recovery = input.error.recovery;
    }
  }

  return output;
}

// =============================================================================
// Hook Output Formatting (T035)
// =============================================================================

/**
 * Format input for formatHookOutput function
 */
export interface FormatHookInput {
  hookType?: "UserPromptSubmit" | "PreToolUse" | "PostToolUse" | "SessionStart";
  context?: string;
  additionalContext?: string;
  allow?: boolean;
  message?: string;
  passthrough?: boolean;
}

/**
 * Format command result as hook output for Claude Code
 *
 * Implements the HookOutput contract from cli-interface.ts
 *
 * @param input - Format input with hook-specific fields
 * @returns HookOutput structure
 */
export function formatHookOutput(input: FormatHookInput): HookOutput {
  // Passthrough: return empty object (no hook intervention)
  if (input.passthrough) {
    return {};
  }

  const output: HookOutput = {};

  // UserPromptSubmit: inject context into prompt
  if (input.hookType === "UserPromptSubmit" && input.context) {
    output.context = input.context;
  }

  // SessionStart: use hookSpecificOutput.additionalContext
  if (input.hookType === "SessionStart" && input.additionalContext) {
    output.hookSpecificOutput = {
      additionalContext: input.additionalContext,
    };
  }

  // PreToolUse: allow/deny with optional message
  if (input.hookType === "PreToolUse") {
    if (input.allow !== undefined) {
      output.allow = input.allow;
    }
    if (input.message) {
      output.message = input.message;
    }
  }

  // Generic message (can be used with any hook type)
  if (input.message && !output.message) {
    output.message = input.message;
  }

  return output;
}

// =============================================================================
// Legacy Output Formatting (preserved for backward compatibility)
// =============================================================================

/**
 * Format CommandResult for CLI mode output
 * Writes output to stdout and errorOutput to stderr
 */
export function formatCliOutput(result: CommandResult): void {
  if (result.output) {
    process.stdout.write(result.output);
    // Add newline if output doesn't end with one
    if (!result.output.endsWith("\n")) {
      process.stdout.write("\n");
    }
  }

  if (result.errorOutput) {
    process.stderr.write(result.errorOutput);
    // Add newline if error output doesn't end with one
    if (!result.errorOutput.endsWith("\n")) {
      process.stderr.write("\n");
    }
  }
}

/**
 * Format CommandResult for hook mode output
 * Returns the result as-is for JSON serialization
 */
export function formatLegacyHookOutput(result: CommandResult): CommandResult {
  return result;
}

/**
 * Format output based on execution mode
 * Either writes to stdout/stderr (CLI) or returns result (hook)
 */
export function formatOutput(
  result: CommandResult,
  mode: ExecutionMode
): CommandResult | void {
  if (mode === "hook") {
    return formatLegacyHookOutput(result);
  }
  formatCliOutput(result);
}

/**
 * Create a success CommandResult
 */
export function successResult(
  output: string,
  metadata?: Record<string, unknown>
): CommandResult {
  return {
    success: true,
    output,
    errorOutput: null,
    exitCode: 0,
    metadata: metadata ?? null,
  };
}

/**
 * Create a failure CommandResult
 */
export function failureResult(
  errorOutput: string,
  exitCode: number = 1,
  metadata?: Record<string, unknown>
): CommandResult {
  return {
    success: false,
    output: "",
    errorOutput,
    exitCode,
    metadata: metadata ?? null,
  };
}

/**
 * Format data as JSON string with optional pretty-printing
 */
export function formatJson(
  data: unknown,
  pretty: boolean = false
): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Format a list of items as a bulleted list
 */
export function formatList(items: string[], bullet: string = "-"): string {
  return items.map((item) => `${bullet} ${item}`).join("\n");
}

/**
 * Format a table from data
 * Simple text-based table formatter
 */
export function formatTable(
  headers: string[],
  rows: string[][]
): string {
  // Calculate column widths
  const widths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map((row) => (row[i] || "").length));
    return Math.max(header.length, maxRowWidth);
  });

  // Format header row
  const headerRow = headers
    .map((header, i) => header.padEnd(widths[i] ?? 0))
    .join(" | ");

  // Format separator row
  const separator = widths.map((width) => "-".repeat(width ?? 0)).join("-|-");

  // Format data rows
  const dataRows = rows.map((row) =>
    row.map((cell, i) => (cell || "").padEnd(widths[i] ?? 0)).join(" | ")
  );

  return [headerRow, separator, ...dataRows].join("\n");
}

/**
 * Colorize output for CLI mode (if TTY supports it)
 * No-op in hook mode
 */
export function colorize(
  text: string,
  color: "red" | "green" | "yellow" | "blue" | "gray",
  mode: ExecutionMode
): string {
  // Don't colorize in hook mode
  if (mode === "hook") {
    return text;
  }

  // Don't colorize if not a TTY
  if (!process.stdout.isTTY) {
    return text;
  }

  const colors = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    gray: "\x1b[90m",
  };

  const reset = "\x1b[0m";
  return `${colors[color]}${text}${reset}`;
}

/**
 * Format progress indicator
 */
export function formatProgress(
  current: number,
  total: number,
  label?: string
): string {
  const percentage = Math.round((current / total) * 100);
  const progressBar = "=".repeat(Math.floor(percentage / 5));
  const emptyBar = " ".repeat(20 - Math.floor(percentage / 5));

  const labelText = label ? `${label}: ` : "";
  return `${labelText}[${progressBar}${emptyBar}] ${percentage}% (${current}/${total})`;
}
