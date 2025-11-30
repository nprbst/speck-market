#!/usr/bin/env bun

/**
 * CLI Command: speck worktree list
 *
 * Standalone command wrapper for listing worktrees.
 * Supports JSON output and verbose mode for detailed information.
 */

import { listWorktrees } from "./git";
import { WorktreeError } from "./errors";
import type { Worktree } from "./types";

export interface ListCommandOptions {
  repoPath: string;
  json?: boolean;
  verbose?: boolean;
}

/**
 * Execute the list command
 */
export async function executeListCommand(
  options: ListCommandOptions
): Promise<void> {
  const { repoPath, json, verbose } = options;

  try {
    // List all worktrees
    const worktrees = await listWorktrees(repoPath);

    // Output results
    if (json) {
      console.log(JSON.stringify({ worktrees }, null, 2));
    } else {
      if (worktrees.length === 0) {
        console.log("No worktrees found");
      } else {
        console.log(`Found ${worktrees.length} worktree(s):\n`);
        worktrees.forEach((wt) => {
          formatWorktreeOutput(wt, verbose ?? false);
        });
      }
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

/**
 * Format worktree output for console display
 */
function formatWorktreeOutput(worktree: Worktree, verbose: boolean): void {
  const branchName = worktree.branch || "(main)";
  console.log(`  ${branchName}`);
  console.log(`    Path: ${worktree.path}`);

  if (verbose) {
    // In verbose mode, show additional details
    console.log(`    Commit: ${worktree.commit}`);
    if (worktree.prunable) {
      console.log(`    Prunable: yes (${worktree.prunable})`);
    } else {
      console.log(`    Prunable: no`);
    }
  }

  console.log();
}
