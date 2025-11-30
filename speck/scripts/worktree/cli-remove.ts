#!/usr/bin/env bun

/**
 * CLI Command: speck worktree remove
 *
 * Standalone command wrapper for removing worktrees.
 * Provides detailed error handling and user-friendly output.
 */

import { removeWorktree } from "./remove";
import { WorktreeError } from "./errors";
import type { RemoveWorktreeOptions } from "./types";

export interface RemoveCommandOptions {
  branch: string;
  repoPath: string;
  force?: boolean;
  json?: boolean;
}

/**
 * Execute the remove command
 */
export async function executeRemoveCommand(
  options: RemoveCommandOptions
): Promise<void> {
  const { branch, repoPath, force, json } = options;

  try {
    // Prepare removeWorktree options
    const removeOptions: RemoveWorktreeOptions = {
      repoPath,
      branchName: branch,
      force: force ?? false,
    };

    // Remove worktree
    await removeWorktree(removeOptions);

    // Output results
    if (json) {
      console.log(JSON.stringify({ success: true, branchName: branch }));
    } else {
      console.log(`✓ Removed worktree for branch ${branch}`);
    }
  } catch (error) {
    if (json) {
      console.log(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    } else {
      if (error instanceof WorktreeError) {
        console.error(`✗ ${error.message}`);
        if (error.cause) {
          console.error(`  Cause: ${String(error.cause)}`);
        }
      } else {
        console.error(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    process.exit(1);
  }
}
