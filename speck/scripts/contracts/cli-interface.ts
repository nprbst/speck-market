/**
 * CLI Interface Contracts for .speck/scripts/
 *
 * These TypeScript interfaces define the contract that all Bun scripts
 * must implement to ensure CLI interface compatibility with upstream
 * bash equivalents.
 */

/**
 * Standard exit codes for all scripts
 */
export enum ExitCode {
  SUCCESS = 0,
  USER_ERROR = 1,
  SYSTEM_ERROR = 2,
}

/**
 * Base CLI options supported by all scripts
 */
export interface BaseCliOptions {
  /** Output JSON format instead of human-readable */
  json?: boolean;

  /** Show help message */
  help?: boolean;

  /** Show version information */
  version?: boolean;
}

/**
 * Result from CLI script execution
 */
export interface CliResult<T = unknown> {
  /** Exit code (0 = success, 1 = user error, 2 = system error) */
  exitCode: ExitCode;

  /** Standard output content */
  stdout: string;

  /** Standard error content */
  stderr: string;

  /** Parsed data (if --json flag used) */
  data?: T;
}

/**
 * CLI options for /speck.check-upstream
 */
export interface CheckUpstreamOptions extends BaseCliOptions {
  // No additional options beyond base
}

/**
 * JSON output schema for /speck.check-upstream --json
 */
export interface CheckUpstreamOutput {
  releases: Array<{
    version: string;
    publishedAt: string;
    notesUrl: string;
    notesSummary: string;
  }>;
}

/**
 * CLI options for /speck.pull-upstream
 */
export interface PullUpstreamOptions extends Omit<BaseCliOptions, 'version'> {
  /** Release version to pull (required, positional arg) */
  version: string;
}

/**
 * JSON output schema for /speck.pull-upstream --json
 */
export interface PullUpstreamOutput {
  version: string;
  commit: string;
  pullDate: string;
  status: "pulled";
  directory: string;
}

/**
 * CLI options for /speck.transform-upstream
 */
export interface TransformUpstreamOptions extends Omit<BaseCliOptions, 'version'> {
  /** Specific version to transform (optional, defaults to latest) */
  version?: string;
}

/**
 * JSON output schema for /speck.transform-upstream --json
 */
export interface TransformUpstreamOutput {
  upstreamVersion: string;
  transformDate: string;
  status: "transformed" | "failed";
  bunScriptsGenerated: Array<{
    path: string;
    bashSource: string;
    strategy: "pure-typescript" | "bun-shell" | "bun-spawn";
  }>;
  speckCommandsGenerated: Array<{
    commandName: string;
    specKitSource: string;
    scriptReference: string;
  }>;
  agentsFactored: Array<{
    path: string;
    purpose: string;
  }>;
  skillsFactored: Array<{
    path: string;
    purpose: string;
  }>;
  errorDetails?: string;
}

/**
 * Type guard to check if script output is in JSON format
 */
export function isJsonOutput(result: CliResult): boolean {
  try {
    JSON.parse(result.stdout);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse JSON output from CLI result
 */
export function parseJsonOutput<T>(result: CliResult): T {
  if (result.exitCode !== ExitCode.SUCCESS) {
    throw new Error(`Cannot parse JSON from failed command: ${result.stderr}`);
  }

  return JSON.parse(result.stdout) as T;
}

/**
 * Format error message for CLI output
 */
export function formatCliError(message: string, details?: string): string {
  let output = `Error: ${message}\n`;
  if (details) {
    output += `\nDetails:\n${details}\n`;
  }
  return output;
}

/**
 * Format success message for CLI output
 */
export function formatCliSuccess(message: string, details?: string): string {
  let output = message;
  if (details) {
    output += `\n${details}`;
  }
  return output;
}

/**
 * CLI options for create-worktree
 */
export interface CreateWorktreeOptions extends BaseCliOptions {
  /** Branch name for the worktree (required) */
  branchName: string;

  /** Create a new branch instead of checking out existing */
  createNew?: boolean;

  /** Skip dependency installation */
  skipInstall?: boolean;

  /** Skip opening in VS Code */
  skipVscode?: boolean;

  /** Auto-confirm all prompts (non-interactive mode for Claude) */
  autoConfirm?: boolean;
}

/**
 * JSON output schema for create-worktree --json
 */
export interface CreateWorktreeOutput {
  worktreePath: string;
  branchName: string;
  isNewBranch: boolean;
  itemsCopied: string[];
  itemsSymlinked: string[];
  dependenciesInstalled: boolean;
  vscodeOpened: boolean;
}

/**
 * CLI options for remove-worktree
 */
export interface RemoveWorktreeOptions extends BaseCliOptions {
  /** Path to worktree to remove (required) */
  worktreePath: string;

  /** Force removal even with uncommitted changes */
  force?: boolean;

  /** Delete the branch after removing worktree */
  deleteBranch?: boolean;

  /** Auto-confirm all prompts (non-interactive mode for Claude) */
  autoConfirm?: boolean;

  /** Skip push prompt for unpushed commits */
  skipPush?: boolean;
}

/**
 * JSON output schema for remove-worktree --json
 */
export interface RemoveWorktreeOutput {
  worktreePath: string;
  branchName: string;
  hadUncommittedChanges: boolean;
  hadUnpushedCommits: boolean;
  branchDeleted: boolean;
  warnings: string[];
}
