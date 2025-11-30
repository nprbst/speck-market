#!/usr/bin/env bun

/**
 * CLI Command: speck worktree prune
 *
 * Standalone command wrapper for pruning stale worktree references.
 * Supports dry-run mode to preview changes without making them.
 */

import { pruneWorktrees } from "./git";
import { WorktreeError } from "./errors";

export interface PruneCommandOptions {
  repoPath: string;
  dryRun?: boolean;
  json?: boolean;
}

/**
 * Execute the prune command
 */
export async function executePruneCommand(
  options: PruneCommandOptions
): Promise<void> {
  const { repoPath, dryRun, json } = options;

  try {
    // Prune stale worktrees
    const result = await pruneWorktrees(repoPath, dryRun ?? false);

    // Output results
    if (json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            prunedCount: result.prunedCount,
            prunedPaths: result.prunedPaths,
            dryRun: dryRun ?? false,
          },
          null,
          2
        )
      );
    } else {
      if (result.prunedCount === 0) {
        console.log("✓ No stale worktrees found");
      } else {
        if (dryRun) {
          console.log(
            `Would prune ${result.prunedCount} stale worktree(s):`
          );
        } else {
          console.log(`✓ Pruned ${result.prunedCount} stale worktree(s):`);
        }
        result.prunedPaths?.forEach((path) => console.log(`  - ${path}`));
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
