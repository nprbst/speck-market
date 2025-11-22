/**
 * Custom Error Classes for Stacked PR Support
 *
 * Feature: 008-stacked-pr-support
 * Created: 2025-11-18
 */

/**
 * Base error for stacked PR mode operations
 */
export class StackedModeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StackedModeError";
  }
}

/**
 * Validation error for branch mapping operations
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Git operation error
 */
export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitError";
  }
}
