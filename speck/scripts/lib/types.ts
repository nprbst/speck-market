/**
 * Type definitions for virtual command pattern
 * Based on contracts in specs/010-virtual-command-pattern/contracts/
 */

/**
 * JSON structure received via stdin when Claude Code invokes PreToolUse hook
 */
export interface HookInput {
  tool_name: "Bash";
  tool_input: {
    command: string;
    description?: string;
    timeout?: number;
  };
}

/**
 * JSON structure written to stdout by PreToolUse hook to control command execution
 */
export type HookOutput = InterceptedCommand | PassThrough;

/**
 * Hook intercepts and modifies the command
 */
export interface InterceptedCommand {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "allow";
    updatedInput: {
      command: string;
    };
  };
}

/**
 * Hook does not intercept, lets Claude execute original command
 */
export type PassThrough = Record<string, never>;

/**
 * Outcome of executing a command handler
 */
export interface CommandResult {
  success: boolean;
  output: string;
  errorOutput: string | null;
  exitCode: number;
  metadata?: Record<string, unknown> | null;
}

/**
 * Execution context provided to command handlers
 */
export interface CommandContext {
  mode: ExecutionMode;
  rawCommand: string;
  workingDirectory: string;
  isInteractive: boolean;
}

/**
 * Execution mode: CLI (standalone) or hook (invoked by Claude Code)
 */
export type ExecutionMode = "cli" | "hook";

/**
 * Function signature for custom command argument parsing
 */
export type ArgumentParser<T = unknown> = (commandString: string) => T;

/**
 * Function signature for command implementation logic
 */
export type CommandHandler<TArgs = unknown> = (
  args: TArgs,
  context: CommandContext
) => Promise<CommandResult>;

/**
 * Main function signature for scripts (returns exit code)
 */
export type MainFunction = (args: string[]) => Promise<number>;

/**
 * Lazy loader for main function (for code splitting)
 */
export type LazyMainLoader = () => Promise<MainFunction>;

/**
 * Registration metadata for a command handler
 */
export interface CommandRegistryEntry<TArgs = unknown> {
  handler?: CommandHandler<TArgs>;
  main?: MainFunction;
  lazyMain?: LazyMainLoader;
  parseArgs?: ArgumentParser<TArgs>;
  description: string;
  version: string;
}

/**
 * Centralized registry mapping command names to handlers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandRegistry = Record<string, CommandRegistryEntry<any>>;
