/**
 * Error handling utilities for dual-mode CLI operation
 * Provides consistent error formatting across CLI and hook modes
 */

import type { CommandResult, ExecutionMode } from "./types";

/**
 * Custom error class for command-specific errors
 * Includes exit code and optional metadata for structured error responses
 */
export class CommandError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number = 1,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CommandError";
    Error.captureStackTrace(this, CommandError);
  }
}

/**
 * Format error for CLI mode output
 * Writes to stderr with colored output if TTY is available
 */
export function formatCliError(error: Error | CommandError): string {
  const message = error.message;

  // Check if stderr is a TTY for color support
  const supportsColor = process.stderr.isTTY;

  if (supportsColor) {
    // Red color for errors in TTY mode
    return `\x1b[31mError:\x1b[0m ${message}`;
  }

  return `Error: ${message}`;
}

/**
 * Format error for hook mode output
 * Returns CommandResult with error information for JSON serialization
 */
export function formatHookError(error: Error | CommandError): CommandResult {
  const isCommandError = error instanceof CommandError;
  const exitCode = isCommandError ? error.exitCode : 1;
  const metadata = isCommandError ? error.metadata : undefined;

  return {
    success: false,
    output: "",
    errorOutput: error.message,
    exitCode,
    metadata: metadata ?? null,
  };
}

/**
 * Format error based on execution mode
 * Returns appropriate format for CLI or hook mode
 */
export function formatError(
  error: Error | CommandError,
  mode: ExecutionMode
): CommandResult | string {
  if (mode === "hook") {
    return formatHookError(error);
  }
  return formatCliError(error);
}

/**
 * Create a CommandResult from an error
 * Useful for consistent error handling in command handlers
 */
export function errorToResult(error: Error | CommandError): CommandResult {
  return formatHookError(error);
}

/**
 * Wrap a function with error handling
 * Catches errors and converts them to CommandResult
 */
export function withErrorHandling<TArgs>(
  handler: (args: TArgs) => Promise<CommandResult>
): (args: TArgs) => Promise<CommandResult> {
  return async (args: TArgs): Promise<CommandResult> => {
    try {
      return await handler(args);
    } catch (error) {
      if (error instanceof Error) {
        return errorToResult(error);
      }
      // Handle non-Error throws
      return {
        success: false,
        output: "",
        errorOutput: String(error),
        exitCode: 1,
        metadata: null,
      };
    }
  };
}

/**
 * Common error messages and constructors
 */
export const ErrorMessages = {
  INVALID_ARGUMENTS: (message: string): CommandError =>
    new CommandError(`Invalid arguments: ${message}`, 1),
  MISSING_REQUIRED_ARG: (argName: string): CommandError =>
    new CommandError(`Missing required argument: ${argName}`, 1),
  COMMAND_NOT_FOUND: (commandName: string): CommandError =>
    new CommandError(`Command not found: ${commandName}`, 127),
  PERMISSION_DENIED: (resource: string): CommandError =>
    new CommandError(`Permission denied: ${resource}`, 126),
  FILE_NOT_FOUND: (filePath: string): CommandError =>
    new CommandError(`File not found: ${filePath}`, 2),
  INVALID_STATE: (message: string): CommandError =>
    new CommandError(`Invalid state: ${message}`, 1),
  EXECUTION_FAILED: (message: string): CommandError =>
    new CommandError(`Execution failed: ${message}`, 1),
};
