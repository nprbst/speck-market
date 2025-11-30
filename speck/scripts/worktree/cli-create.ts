#!/usr/bin/env bun

/**
 * CLI Command: speck worktree create
 *
 * Standalone command wrapper for creating worktrees with full configuration support.
 * Provides detailed error handling and user-friendly output.
 */

import { createWorktree } from "./create";
import { loadConfig } from "./config";
import { WorktreeError } from "./errors";
import type { CreateWorktreeOptions } from "./types";

export interface CreateCommandOptions {
  branch: string;
  repoPath: string;
  worktreePath?: string;
  skipIDE?: boolean;
  skipDeps?: boolean;
  reuseExisting?: boolean;
  json?: boolean;
}

/**
 * Execute the create command
 */
export async function executeCreateCommand(
  options: CreateCommandOptions
): Promise<void> {
  const { branch, repoPath, worktreePath, skipIDE, skipDeps, reuseExisting, json } = options;

  try {
    // Load configuration to check if worktree is enabled
    const config = await loadConfig(repoPath);

    if (!config.worktree?.enabled) {
      if (json) {
        console.log(
          JSON.stringify({
            success: false,
            message: "Worktree integration is disabled in .speck/config.json",
            skipped: true,
          })
        );
      } else {
        console.log(
          "⚠ Worktree integration is disabled. Set worktree.enabled = true in .speck/config.json"
        );
      }
      process.exit(0);
    }

    // Prepare createWorktree options
    const createOptions: CreateWorktreeOptions = {
      repoPath,
      branchName: branch,
      worktreePath,
      skipIDE: skipIDE ?? false,
      skipDeps: skipDeps ?? false,
      reuseExisting: reuseExisting ?? false,
    };

    // Create worktree
    const result = await createWorktree(createOptions);

    // Output results
    if (json) {
      console.log(
        JSON.stringify(
          {
            success: result.success,
            worktreePath: result.worktreePath,
            branchName: result.metadata.branchName,
            status: result.metadata.status,
            errors: result.errors,
          },
          null,
          2
        )
      );
    } else {
      if (result.success) {
        console.log(`✓ Created worktree at ${result.worktreePath}`);
        if (config.worktree.ide?.autoLaunch && !skipIDE) {
          console.log(`✓ Launched ${config.worktree.ide.editor}`);
        }
        if (
          config.worktree.dependencies?.autoInstall &&
          !skipDeps &&
          result.metadata.status === "ready"
        ) {
          console.log(`✓ Dependencies installed successfully`);
        }
      } else {
        console.error(`✗ Failed to create worktree:`);
        result.errors?.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
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
