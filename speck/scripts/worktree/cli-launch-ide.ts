#!/usr/bin/env bun

/**
 * CLI Command: speck worktree launch-ide
 *
 * Standalone command for launching IDE in an existing worktree.
 * Used by /speck.specify for deferred IDE launch after spec is complete.
 *
 * @feature 015-scope-simplification
 */

import { parseArgs } from "node:util";
import { loadConfig } from "./config";
import { launchIDE } from "./ide-launch";

export interface LaunchIDECommandOptions {
  worktreePath: string;
  repoPath?: string;
  json?: boolean;
}

/**
 * Execute the launch-ide command
 */
export async function executeLaunchIDECommand(
  options: LaunchIDECommandOptions
): Promise<void> {
  const { worktreePath, repoPath = ".", json = false } = options;

  try {
    // Load configuration
    const config = await loadConfig(repoPath);

    if (!config.worktree?.ide?.autoLaunch) {
      if (json) {
        console.log(
          JSON.stringify({
            success: true,
            skipped: true,
            message: "IDE auto-launch is disabled in configuration",
          })
        );
      } else {
        console.log(`⚠ IDE auto-launch is disabled. Run 'speck init' to configure, or launch manually.`);
      }
      return;
    }

    // Launch IDE
    const result = launchIDE({
      worktreePath,
      editor: config.worktree.ide.editor,
      newWindow: config.worktree.ide.newWindow,
    });

    if (json) {
      console.log(
        JSON.stringify({
          success: result.success,
          editor: result.editor,
          command: result.command,
          error: result.error,
        })
      );
    } else {
      if (result.success) {
        console.log(`✓ Launched ${result.editor} at ${worktreePath}`);
      } else {
        console.error(`⚠ IDE launch failed: ${result.error}`);
        // Non-fatal - don't exit with error
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (json) {
      console.log(
        JSON.stringify({
          success: false,
          error: errorMessage,
        })
      );
    } else {
      console.error(`⚠ Error: ${errorMessage}`);
    }
    // IDE launch failure is non-fatal
  }
}

/**
 * CLI main function - parses args and calls executeLaunchIDECommand
 * Provides uniform interface matching other speck commands
 */
export async function main(args: string[]): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      "worktree-path": { type: "string" },
      "repo-path": { type: "string", default: "." },
      json: { type: "boolean", default: false },
    },
  });

  if (!values["worktree-path"]) {
    console.error("Error: --worktree-path is required");
    return 1;
  }

  try {
    await executeLaunchIDECommand({
      worktreePath: values["worktree-path"],
      repoPath: values["repo-path"] ?? ".",
      json: values.json ?? false,
    });
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error:", message);
    return 1;
  }
}

if (import.meta.main) {
  void main(process.argv.slice(2)).then((exitCode) => {
    process.exit(exitCode);
  });
}
