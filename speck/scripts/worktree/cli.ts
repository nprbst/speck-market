#!/usr/bin/env bun

/**
 * CLI Entry Point for Worktree Operations
 *
 * Provides command-line interface for worktree management.
 * Used by slash commands (/speck:specify, /speck:branch) to create worktrees.
 */

import { parseArgs } from "util";
import { executeCreateCommand } from "./cli-create";
import { executeRemoveCommand } from "./cli-remove";
import { executeListCommand } from "./cli-list";
import { executePruneCommand } from "./cli-prune";
import { executeInitCommand } from "./cli-init";
import { executeLaunchIDECommand } from "./cli-launch-ide";

const USAGE = `
Speck Worktree CLI

Usage:
  bun .speck/scripts/worktree/cli.ts <command> [options]

Commands:
  create      Create a new worktree for a branch
  remove      Remove an existing worktree
  list        List all worktrees
  prune       Cleanup stale worktree references
  init        Initialize or update worktree configuration
  launch-ide  Launch IDE in an existing worktree (deferred launch)

Create Options:
  --branch <name>         Branch name for the worktree
  --repo-path <path>      Path to repository root (default: .)
  --worktree-path <path>  Custom worktree path (default: .speck/worktrees/<branch>)
  --no-ide                Skip IDE auto-launch (override config)
  --no-deps               Skip dependency installation (override config)
  --reuse                 Reuse existing worktree directory if it exists
  --json                  Output results as JSON

Remove Options:
  --branch <name>         Branch name for the worktree
  --repo-path <path>      Path to repository root (default: .)
  --force                 Force removal even if worktree has uncommitted changes
  --json                  Output results as JSON

List Options:
  --repo-path <path>      Path to repository root (default: .)
  --json                  Output results as JSON
  --verbose               Show detailed worktree information

Prune Options:
  --repo-path <path>      Path to repository root (default: .)
  --dry-run               Show what would be pruned without removing
  --json                  Output results as JSON

Init Options:
  --repo-path <path>      Path to repository root (default: .)
  --defaults              Use default configuration values (non-interactive)
  --minimal               Use minimal configuration (worktree enabled only)
  --json                  Output results as JSON

Launch-IDE Options:
  --worktree-path <path>  Path to the worktree directory (required)
  --repo-path <path>      Path to repository root for config (default: .)
  --json                  Output results as JSON

Global Options:
  --help                  Show this help message

Examples:
  # Create worktree for feature branch
  bun .speck/scripts/worktree/cli.ts create --branch 001-user-auth

  # List all worktrees with details
  bun .speck/scripts/worktree/cli.ts list --verbose

  # Prune stale worktrees (dry-run)
  bun .speck/scripts/worktree/cli.ts prune --dry-run

  # Initialize with default configuration
  bun .speck/scripts/worktree/cli.ts init --defaults
`;

interface CliArgs {
  command?: string;
  branch?: string;
  "repo-path"?: string;
  "worktree-path"?: string;
  "no-ide"?: boolean;
  "no-deps"?: boolean;
  reuse?: boolean;
  force?: boolean;
  verbose?: boolean;
  "dry-run"?: boolean;
  defaults?: boolean;
  minimal?: boolean;
  json?: boolean;
  help?: boolean;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Show help if no args
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }

  // Parse command (first positional arg)
  const command = args[0];
  if (!command || !["create", "remove", "list", "prune", "init", "launch-ide"].includes(command)) {
    console.error(`Error: Unknown command '${command || "(none)"}'`);
    console.log(USAGE);
    process.exit(1);
  }

  // Parse named arguments
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      branch: { type: "string" },
      "repo-path": { type: "string" },
      "worktree-path": { type: "string" },
      "no-ide": { type: "boolean", default: false },
      "no-deps": { type: "boolean", default: false },
      reuse: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      defaults: { type: "boolean", default: false },
      minimal: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  }) as { values: CliArgs };

  const repoPath = values["repo-path"] || ".";

  try {
    switch (command) {
      case "create": {
        if (!values.branch) {
          throw new Error("--branch is required for 'create' command");
        }

        await executeCreateCommand({
          branch: values.branch,
          repoPath,
          worktreePath: values["worktree-path"],
          skipIDE: values["no-ide"],
          skipDeps: values["no-deps"],
          reuseExisting: values.reuse ?? false,
          json: values.json ?? false,
        });
        break;
      }

      case "remove": {
        if (!values.branch) {
          throw new Error("--branch is required for 'remove' command");
        }

        await executeRemoveCommand({
          branch: values.branch,
          repoPath,
          force: values.force ?? false,
          json: values.json ?? false,
        });
        break;
      }

      case "list": {
        await executeListCommand({
          repoPath,
          json: values.json ?? false,
          verbose: values.verbose ?? false,
        });
        break;
      }

      case "prune": {
        await executePruneCommand({
          repoPath,
          dryRun: values["dry-run"] ?? false,
          json: values.json ?? false,
        });
        break;
      }

      case "init": {
        await executeInitCommand({
          repoPath,
          defaults: values.defaults ?? false,
          minimal: values.minimal ?? false,
          json: values.json ?? false,
        });
        break;
      }

      case "launch-ide": {
        if (!values["worktree-path"]) {
          throw new Error("--worktree-path is required for 'launch-ide' command");
        }

        await executeLaunchIDECommand({
          worktreePath: values["worktree-path"],
          repoPath,
          json: values.json ?? false,
        });
        break;
      }
    }
  } catch (error) {
    const outputJson = values.json ?? false;
    if (outputJson) {
      console.log(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }
}

void main();
