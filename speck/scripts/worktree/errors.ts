/**
 * Error Classes for Worktree Operations
 *
 * This module defines custom error types for different failure scenarios
 * in worktree operations.
 */

import type { PackageManager, IDEEditor } from "./config-schema";

/**
 * Base error class for worktree operations
 */
export class WorktreeError extends Error {
  constructor(message: string, public code?: string, public context?: unknown) {
    super(message);
    this.name = "WorktreeError";
  }
}

/**
 * Error when Git worktree operation fails
 */
export class GitWorktreeError extends WorktreeError {
  constructor(message: string, public gitOutput?: string) {
    super(message, "GIT_WORKTREE_ERROR");
    this.name = "GitWorktreeError";
  }
}

/**
 * Error when file operations fail
 */
export class FileOperationError extends WorktreeError {
  constructor(message: string, public path?: string) {
    super(message, "FILE_OPERATION_ERROR", { path });
    this.name = "FileOperationError";
  }
}

/**
 * Error when dependency installation fails
 */
export class DependencyInstallError extends WorktreeError {
  constructor(
    message: string,
    public packageManager: PackageManager,
    public installOutput?: string
  ) {
    super(message, "DEPENDENCY_INSTALL_ERROR", { packageManager });
    this.name = "DependencyInstallError";
  }
}

/**
 * Error when IDE launch fails (non-fatal)
 */
export class IDELaunchError extends WorktreeError {
  constructor(message: string, public editor: IDEEditor) {
    super(message, "IDE_LAUNCH_ERROR", { editor });
    this.name = "IDELaunchError";
  }
}

/**
 * Error when disk space is insufficient
 */
export class DiskSpaceError extends WorktreeError {
  constructor(
    message: string,
    public required: number,
    public available: number
  ) {
    super(message, "DISK_SPACE_ERROR", { required, available });
    this.name = "DiskSpaceError";
  }
}

/**
 * Error when configuration is invalid
 */
export class ConfigValidationError extends WorktreeError {
  constructor(message: string, public validationErrors?: string[]) {
    super(message, "CONFIG_VALIDATION_ERROR", { validationErrors });
    this.name = "ConfigValidationError";
  }
}
