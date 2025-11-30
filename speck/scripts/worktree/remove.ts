/**
 * Worktree Removal
 *
 * This module implements worktree removal, including cleanup of
 * the worktree directory and optionally the branch.
 */

import { existsSync } from "fs";
import { rm } from "fs/promises";
import { $ } from "bun";
import { removeWorktreeGit, getWorktreePath } from "./git";
import { GitWorktreeError } from "./errors";
import type { RemoveWorktreeOptions, RemoveWorktreeResult } from "./types";

/**
 * Remove a Git worktree
 *
 * This function:
 * 1. Checks if worktree exists for the branch
 * 2. Removes the worktree using git worktree remove
 * 3. Optionally deletes the branch
 * 4. Cleans up any remaining files
 *
 * @param options - Worktree removal options
 * @returns Result of removal operation
 * @throws Error if worktree doesn't exist or removal fails
 */
export async function removeWorktree(
  options: RemoveWorktreeOptions
): Promise<RemoveWorktreeResult> {
  const {
    repoPath,
    branchName,
    force = false,
    deleteBranch = false,
  } = options;

  try {
    // Step 1: Find worktree path for this branch
    const worktreePath = await getWorktreePath(repoPath, branchName);

    if (!worktreePath) {
      throw new GitWorktreeError(
        `No worktree found for branch '${branchName}'`
      );
    }

    // Step 2: Remove worktree using Git
    try {
      await removeWorktreeGit(repoPath, worktreePath, force);
    } catch (error) {
      // If git worktree remove fails, try manual cleanup
      if (existsSync(worktreePath)) {
        await rm(worktreePath, { recursive: true, force: true });
      }
    }

    // Step 3: Delete branch if requested
    let branchDeleted = false;
    if (deleteBranch) {
      try {
        const deleteFlag = force ? "-D" : "-d";
        await $`git -C ${repoPath} branch ${deleteFlag} ${branchName}`.quiet();
        branchDeleted = true;
      } catch (error) {
        // Branch deletion failed, but worktree is removed
        // This is non-fatal
      }
    }

    return {
      success: true,
      worktreePath,
      branchDeleted,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new GitWorktreeError(
      `Failed to remove worktree: ${errorMessage}`,
      errorMessage
    );
  }
}

/**
 * List all removable worktrees (helper function)
 *
 * @param repoPath - Absolute path to repository root
 * @returns Array of worktree paths that can be removed
 */
export async function listRemovableWorktrees(
  repoPath: string
): Promise<string[]> {
  const { listWorktrees } = await import("./git");
  const worktrees = await listWorktrees(repoPath);

  // Filter out the main worktree (first entry)
  return worktrees
    .slice(1)
    .map(w => w.path);
}
