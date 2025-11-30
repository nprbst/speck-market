/**
 * Git Worktree Operations
 *
 * This module provides functions for interacting with Git worktrees:
 * listing, creating, removing, and pruning.
 */

import { $ } from "bun";
import type { GitWorktreeInfo, PruneWorktreesResult } from "./types";

/**
 * List all worktrees in the repository
 *
 * Parses output of `git worktree list --porcelain`
 *
 * @param repoPath - Absolute path to repository root
 * @returns Array of worktree information
 */
export async function listWorktrees(
  repoPath: string
): Promise<GitWorktreeInfo[]> {
  try {
    const result = await $`git -C ${repoPath} worktree list --porcelain`.quiet();
    const output = result.stdout.toString();

    const worktrees: GitWorktreeInfo[] = [];
    const lines = output.split("\n");
    let current: Partial<GitWorktreeInfo> = {};

    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        // Save previous worktree if complete
        if (current.path && current.branch && current.commit) {
          worktrees.push(current as GitWorktreeInfo);
        }
        // Start new worktree
        current = { path: line.substring(9) };
      } else if (line.startsWith("HEAD ")) {
        current.commit = line.substring(5, 12); // Short hash (7 chars)
      } else if (line.startsWith("branch ")) {
        current.branch = line.substring(7).replace(/^refs\/heads\//, "");
      } else if (line.startsWith("detached")) {
        current.branch = "detached HEAD";
      } else if (line.startsWith("prunable ")) {
        current.prunable = line.substring(9);
      } else if (line === "") {
        // Empty line marks end of worktree entry
        if (current.path && current.branch && current.commit) {
          worktrees.push(current as GitWorktreeInfo);
        }
        current = {};
      }
    }

    // Don't forget the last worktree
    if (current.path && current.branch && current.commit) {
      worktrees.push(current as GitWorktreeInfo);
    }

    return worktrees;
  } catch (error) {
    // If git worktree list fails, return empty array
    return [];
  }
}

/**
 * Get worktree path for a specific branch
 *
 * @param repoPath - Absolute path to repository root
 * @param branchName - Branch name to check
 * @returns Absolute path if worktree exists, null otherwise
 */
export async function getWorktreePath(
  repoPath: string,
  branchName: string
): Promise<string | null> {
  const worktrees = await listWorktrees(repoPath);

  for (const worktree of worktrees) {
    if (worktree.branch === branchName) {
      return worktree.path;
    }
  }

  return null;
}

/**
 * Check if a directory is a worktree
 *
 * A directory is a worktree if it contains a .git file (not directory)
 * pointing to the main repository's git directory.
 *
 * @param path - Absolute path to directory
 * @returns true if directory is a worktree
 */
export async function isWorktree(path: string): Promise<boolean> {
  try {
    // Check if .git exists and is a file (not a directory)
    const { existsSync, statSync } = await import("fs");
    const gitPath = `${path}/.git`;

    if (!existsSync(gitPath)) {
      return false;
    }

    const stats = statSync(gitPath);
    // Worktrees have .git as a file, regular repos have .git as a directory
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Cleanup stale worktree references
 *
 * Runs `git worktree prune` to remove administrative files for
 * worktrees that were manually deleted.
 *
 * @param repoPath - Absolute path to repository root
 * @param dryRun - If true, show what would be pruned without removing
 * @returns Prune operation result
 */
export async function pruneWorktrees(
  repoPath: string,
  dryRun: boolean = false
): Promise<PruneWorktreesResult> {
  try {
    // First, get list of prunable worktrees
    const worktrees = await listWorktrees(repoPath);
    const prunablePaths = worktrees
      .filter(w => w.prunable)
      .map(w => w.path);

    if (dryRun) {
      return {
        prunedCount: prunablePaths.length,
        prunedPaths: prunablePaths,
      };
    }

    // Run prune command
    await $`git -C ${repoPath} worktree prune`.quiet();

    return {
      prunedCount: prunablePaths.length,
      prunedPaths: prunablePaths,
    };
  } catch (error) {
    // If prune fails, return empty result
    return {
      prunedCount: 0,
      prunedPaths: [],
    };
  }
}

/**
 * Add a new worktree for a branch
 *
 * This is a low-level function that only runs `git worktree add`.
 * For full worktree creation with file setup, deps, etc., use createWorktree() instead.
 *
 * @param repoPath - Absolute path to repository root
 * @param worktreePath - Absolute path where worktree should be created
 * @param branchName - Branch name (must already exist)
 * @returns true if successful
 * @throws Error if git worktree add fails
 */
export async function addWorktree(
  repoPath: string,
  worktreePath: string,
  branchName: string
): Promise<void> {
  try {
    await $`git -C ${repoPath} worktree add ${worktreePath} ${branchName}`.quiet();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create worktree at ${worktreePath} for branch ${branchName}: ${errorMessage}`
    );
  }
}

/**
 * Remove a worktree
 *
 * This is a low-level function that only runs `git worktree remove`.
 * For full cleanup, use removeWorktree() from remove.ts instead.
 *
 * @param repoPath - Absolute path to repository root
 * @param worktreePath - Absolute path to worktree to remove
 * @param force - Force removal even with uncommitted changes
 * @throws Error if git worktree remove fails
 */
export async function removeWorktreeGit(
  repoPath: string,
  worktreePath: string,
  force: boolean = false
): Promise<void> {
  try {
    const forceFlag = force ? "--force" : "";
    if (force) {
      await $`git -C ${repoPath} worktree remove ${forceFlag} ${worktreePath}`.quiet();
    } else {
      await $`git -C ${repoPath} worktree remove ${worktreePath}`.quiet();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to remove worktree at ${worktreePath}: ${errorMessage}`
    );
  }
}
