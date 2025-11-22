#!/usr/bin/env bun

/**
 * UserPromptSubmit Hook
 *
 * Automatically runs prerequisite checks before /speck.* slash commands expand.
 * Injects prerequisite context as additionalContext on success, blocks on failure.
 *
 * Hook Behavior:
 * - Detects /speck.* slash commands in user prompt
 * - Runs check-prerequisites.ts with appropriate flags
 * - Caches results for 5 seconds to avoid redundant checks
 * - Injects context as additionalContext (HTML comment with JSON) on success
 * - Blocks execution with error message on failure
 *
 * @see research.md decision 7 for caching strategy
 */

import {
  runPrerequisiteCheck,
  formatPrereqContext,
  formatPrereqError,
} from "../lib/prereq-runner";
import { appendFile } from "fs/promises";

const LOG_FILE = "/private/tmp/.claude-hook-test/speck-hook-log.txt";

const log = async (msg: string): Promise<void> => {
  await appendFile(LOG_FILE, `[${new Date().toISOString()}] [PrePromptSubmit] ${msg}\n`);
};

/**
 * UserPromptSubmit hook input structure
 */
interface HookInput {
  prompt: string;
  [key: string]: unknown;
}

/**
 * UserPromptSubmit hook output structure
 */
interface HookOutput {
  decision?: "block";
  reason?: string;
  hookSpecificOutput?: {
    hookEventName: "UserPromptSubmit";
    additionalContext?: string;
  };
}

/**
 * Detect if prompt contains a /speck.* or /speck:* slash command
 *
 * Supports both separators:
 * - `/speck.` - Standard slash command format
 * - `/speck:` - Plugin-qualified slash command format (e.g., /speck:plan)
 *
 * @param prompt - The user's prompt
 * @returns True if prompt starts with /speck. or /speck:
 */
function isSpeckSlashCommand(prompt: string): boolean {
  // Match /speck.* or /speck:* at the start of the prompt
  return /^\/speck[.:]/.test(prompt.trim());
}

/**
 * Determine which prerequisite check options to use based on the command
 *
 * Supports both `/speck.command` and `/speck:command` formats.
 *
 * @param prompt - The user's prompt
 * @returns Options for prerequisite check
 */
function getCheckOptions(prompt: string): {
  requireTasks: boolean;
  includeTasks: boolean;
  skipFeatureCheck: boolean;
  skipPlanCheck: boolean;
  includeFileContents: boolean;
  includeWorkflowMode: boolean;
} {
  // Extract the slash command name (supports both . and : separators)
  const match = prompt.match(/^\/speck[.:](\w+)/);
  const command = match?.[1] ?? "";

  // Commands that require tasks.md to exist
  const requireTasksCommands = ["implement"];

  // Commands that should include tasks.md in available docs
  const includeTasksCommands = ["implement", "analyze"];

  // Commands that should skip feature check (e.g., /speck.specify runs before feature exists)
  const skipFeatureCheckCommands = ["specify"];

  // Commands that should skip plan.md check (e.g., /speck.plan creates plan.md)
  const skipPlanCheckCommands = ["plan"];

  // Commands that should pre-load file contents (high/medium priority files)
  const includeFileContentsCommands = [
    "implement",  // existing: reads tasks, plan, constitution, data-model, checklists
    "analyze",    // new: reads spec, plan, tasks, constitution
    "plan",       // new: reads spec, constitution
    "tasks",      // new: reads plan, spec, data-model, research
    "checklist",  // new: reads spec, plan, tasks
    "clarify",    // new: reads spec
  ];

  // Commands that should pre-determine workflow mode
  const includeWorkflowModeCommands = ["implement"];

  return {
    requireTasks: requireTasksCommands.includes(command),
    includeTasks: includeTasksCommands.includes(command),
    skipFeatureCheck: skipFeatureCheckCommands.includes(command),
    skipPlanCheck: skipPlanCheckCommands.includes(command),
    includeFileContents: includeFileContentsCommands.includes(command),
    includeWorkflowMode: includeWorkflowModeCommands.includes(command),
  };
}

/**
 * Main hook function
 */
async function main(): Promise<void> {
  try {
    // Read hook input from stdin
    const input = await Bun.stdin.text();
    await log(`Received hook input (length: ${input.length})`);

    const hookInput = JSON.parse(input) as HookInput;
    const { prompt } = hookInput;
    await log(`Parsed prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);

    // Check if this is a /speck.* command
    if (!isSpeckSlashCommand(prompt)) {
      // Pass through for non-speck commands
      await log(`Not a /speck.* command, passing through`);
      console.log(JSON.stringify({}));
      return;
    }

    const commandMatch = prompt.match(/^\/speck[.:]\w+/);
    await log(`Detected /speck.* command: ${commandMatch?.[0] ?? 'unknown'}`);

    // Determine check options based on command
    const options = getCheckOptions(prompt);
    await log(`Check options: ${JSON.stringify(options)}`);

    // Run prerequisite check (with caching)
    const result = await runPrerequisiteCheck(options, true);
    await log(`Prerequisite check result: success=${result.success}`);

    if (result.success && result.output) {
      // Inject context as additionalContext
      const context = formatPrereqContext(result);
      await log(`Formatted context (length: ${context.length})`);
      await log(`Context preview: ${context.substring(0, 200)}`);

      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: context,
        },
      };

      await log(`Returning success with additionalContext`);
      console.log(JSON.stringify(output));
    } else {
      // Block execution with error message
      const errorMessage = formatPrereqError(result.error || "Unknown error");
      await log(`Blocking with error: ${result.error}`);

      const output: HookOutput = {
        decision: "block",
        reason: errorMessage,
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
        },
      };

      console.log(JSON.stringify(output));
    }
  } catch (error) {
    // Malformed input or unexpected error: pass through to avoid breaking Claude
    const errorMessage = error instanceof Error ? error.message : String(error);
    await log(`Hook error: ${errorMessage}`);
    console.error(`PrePromptSubmit hook error: ${errorMessage}`);
    console.log(JSON.stringify({}));
  }
}

void main();
