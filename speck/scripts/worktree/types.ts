/**
 * Type definitions for Worktree Integration
 *
 * This file contains the type-only definitions from internal-api.ts
 * These are used for type checking but not for runtime implementation.
 */

import type {
  SpeckConfig,
  WorktreeConfig,
  FileRule,
  PackageManager,
  IDEEditor,
  WorktreeMetadata,
  WorktreeState,
  IDEInfo,
} from "./config-schema";

// Re-export types from config-schema
export type {
  SpeckConfig,
  WorktreeConfig,
  FileRule,
  PackageManager,
  IDEEditor,
  WorktreeMetadata,
  WorktreeState,
  IDEInfo,
};

// ============================================================================
// Options and Result Types
// ============================================================================

/**
 * Options for worktree creation
 */
export interface CreateWorktreeOptions {
  repoPath: string;           // Absolute path to main repository
  branchName: string;         // Branch name (without prefix)
  branchPrefix?: string;      // Optional prefix (e.g., "specs/")
  worktreePath?: string;      // Custom worktree path (overrides config)
  reuseExisting?: boolean;    // Reuse existing directory if present
  force?: boolean;            // Force creation, removing existing if needed
  skipDeps?: boolean;         // Skip dependency installation
  skipIDE?: boolean;          // Skip IDE launch
  onProgress?: (message: string, percent: number) => void; // Progress callback
}

/**
 * Result of worktree creation
 */
export interface CreateWorktreeResult {
  success: boolean;
  worktreePath: string;       // Absolute path to created worktree
  metadata: WorktreeMetadata; // Runtime metadata
  errors?: string[];          // Non-fatal errors (e.g., IDE launch failed)
}

/**
 * Options for worktree removal
 */
export interface RemoveWorktreeOptions {
  repoPath: string;           // Absolute path to main repository
  branchName: string;         // Branch name
  force?: boolean;            // Force removal even with uncommitted changes
  deleteBranch?: boolean;     // Also delete the branch
}

/**
 * Result of worktree removal
 */
export interface RemoveWorktreeResult {
  success: boolean;
  worktreePath: string;       // Path that was removed
  branchDeleted?: boolean;    // Whether branch was also deleted
}

/**
 * Worktree information from git worktree list
 */
export interface GitWorktreeInfo {
  path: string;               // Absolute path
  branch: string;             // Branch name (or "detached HEAD")
  commit: string;             // Short commit hash
  prunable?: string;          // Reason if prunable
}

/**
 * Alias for GitWorktreeInfo (for backward compatibility)
 */
export type Worktree = GitWorktreeInfo;

/**
 * Prune result
 */
export interface PruneWorktreesResult {
  prunedCount: number;
  prunedPaths: string[];
}

/**
 * Options for file operations
 */
export interface ApplyFileRulesOptions {
  sourcePath: string;         // Absolute path to source (main repo)
  destPath: string;           // Absolute path to destination (worktree)
  rules: FileRule[];          // File rules to apply
  includeUntracked?: boolean; // Include untracked files in copy operations
  onProgress?: (message: string) => void; // Progress callback
}

/**
 * Result of file operations
 */
export interface ApplyFileRulesResult {
  copiedCount: number;        // Number of files copied
  copiedPaths: string[];      // Relative paths of copied files
  symlinkedCount: number;     // Number of directories symlinked
  symlinkedPaths: string[];   // Relative paths of symlinked directories
  errors: Array<{             // Non-fatal errors
    path: string;
    error: string;
  }>;
}

/**
 * Options for dependency installation
 */
export interface InstallDependenciesOptions {
  worktreePath: string;       // Absolute path to worktree
  packageManager?: PackageManager; // Override detected package manager
  onProgress?: (line: string) => void; // Progress callback (stdout/stderr)
}

/**
 * Result of dependency installation
 */
export interface InstallDependenciesResult {
  success: boolean;
  packageManager: PackageManager; // Package manager that was used
  duration: number;           // Installation time in milliseconds
  error?: string;             // Error message if failed
}

/**
 * Options for IDE launch
 */
export interface LaunchIDEOptions {
  worktreePath: string;       // Absolute path to worktree
  editor: IDEEditor;          // Which IDE to launch
  newWindow?: boolean;        // Open in new window (default: true)
}

/**
 * Result of IDE launch
 */
export interface LaunchIDEResult {
  success: boolean;
  editor: IDEEditor;          // Editor that was launched
  command: string;            // Command that was executed
  error?: string;             // Error message if failed
}

/**
 * Branch creation options with worktree support
 */
export interface CreateBranchWithWorktreeOptions {
  repoPath: string;
  specNumber: string;         // e.g., "002"
  shortName: string;          // e.g., "user-auth"
  createWorktree?: boolean;   // Override config setting
  promptForApproval?: boolean; // Prompt user for branch name approval (FR-016)
}

// ============================================================================
// Error Classes
// ============================================================================

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
