/**
 * Validation Utilities for Worktree Integration
 *
 * This module provides validation functions for Git operations, branch names,
 * disk space checks, and worktree path validation.
 */

import { existsSync, statfs } from "fs";
import { readdir } from "fs/promises";
import { $ } from "bun";

/**
 * Check if Git version supports worktrees (Git 2.5+)
 *
 * @returns true if Git 2.5+ is available
 */
export async function hasWorktreeSupport(): Promise<boolean> {
  try {
    const result = await $`git --version`.quiet();
    const versionMatch = result.stdout.toString().match(/git version (\d+)\.(\d+)/);

    if (!versionMatch || !versionMatch[1] || !versionMatch[2]) {
      return false;
    }

    const major = parseInt(versionMatch[1], 10);
    const minor = parseInt(versionMatch[2], 10);

    // Worktree support was added in Git 2.5
    return major > 2 || (major === 2 && minor >= 5);
  } catch {
    return false;
  }
}

/**
 * Validate branch name format
 *
 * Checks if the branch name follows Git's branch naming rules:
 * - No spaces
 * - No control characters
 * - No double dots (..)
 * - No trailing slash or dot
 * - No special characters like ~, ^, :, \, ?  *, [
 *
 * @param branchName - Branch name to validate
 * @returns true if valid Git branch name
 */
export function isValidBranchName(branchName: string): boolean {
  if (!branchName || branchName.length === 0) {
    return false;
  }

  // Check for invalid patterns
  const invalidPatterns = [
    /\s/,           // No spaces
    /\.\./,         // No double dots
    /^[.]/,         // Cannot start with dot
    /[/.]$/,        // Cannot end with slash or dot
    /[~^:\\?*[\]@{]/, // No special Git ref characters
    /\/\//,         // No consecutive slashes
    /^-/,           // Cannot start with dash
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(branchName)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if worktree directory exists and determine its state
 *
 * @param path - Absolute path to check
 * @returns "empty" | "exists" | "not_found"
 */
export async function checkWorktreePath(
  path: string
): Promise<"empty" | "exists" | "not_found"> {
  if (!existsSync(path)) {
    return "not_found";
  }

  try {
    const entries = await readdir(path);

    // Directory exists but is empty (or only contains hidden files)
    if (entries.length === 0) {
      return "empty";
    }

    // Check if it only contains .git file (which is OK for worktrees)
    if (entries.length === 1 && entries[0] === ".git") {
      return "empty";
    }

    // Directory has content
    return "exists";
  } catch (error) {
    // If we can't read the directory, treat it as existing with content
    return "exists";
  }
}

/**
 * Check if system has sufficient disk space for worktree
 *
 * @param path - Path where worktree will be created
 * @param requiredMB - Required space in megabytes (default: 1000 MB = 1 GB)
 * @returns true if sufficient space available
 */
export async function hasSufficientDiskSpace(
  path: string,
  requiredMB: number = 1000
): Promise<boolean> {
  try {
    // Use parent directory if path doesn't exist yet
    let checkPath = path;
    if (!existsSync(path)) {
      checkPath = path.split("/").slice(0, -1).join("/") || "/";
    }

    // Get filesystem stats
    const stats = await new Promise<{ bavail: number; bsize: number }>((resolve, reject) => {
      statfs(checkPath, (err, stats) => {
        if (err) reject(err);
        else resolve(stats as { bavail: number; bsize: number });
      });
    });

    // Calculate available space in MB
    const availableMB = (stats.bavail * stats.bsize) / (1024 * 1024);

    return availableMB >= requiredMB;
  } catch {
    // If we can't determine disk space, assume it's OK
    // (better to try and fail than block the user)
    return true;
  }
}

/**
 * Check if a branch exists in repository
 *
 * @param repoPath - Absolute path to repository
 * @param branchName - Branch name to check
 * @returns true if branch exists
 */
export async function branchExists(
  repoPath: string,
  branchName: string
): Promise<boolean> {
  try {
    await $`git -C ${repoPath} rev-parse --verify refs/heads/${branchName}`.quiet();
    return true;
  } catch {
    return false;
  }
}
