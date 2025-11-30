/**
 * IDE Launch Module
 *
 * Detects available IDEs and launches them with worktree as workspace.
 * Supports: VSCode, Cursor, WebStorm, IntelliJ IDEA, PyCharm
 */

import type { IDEEditor, IDEInfo } from "./types";
import type { LaunchIDEOptions, LaunchIDEResult } from "./types";

/**
 * IDE configuration map: editor type -> command + display name + default args
 */
const IDE_CONFIG: Record<
  IDEEditor,
  { command: string; name: string; newWindowFlag?: string }
> = {
  vscode: { command: "code", name: "VSCode", newWindowFlag: "-n" },
  cursor: { command: "cursor", name: "Cursor", newWindowFlag: "-n" },
  webstorm: { command: "webstorm", name: "WebStorm" }, // Uses "nosplash" instead
  idea: { command: "idea", name: "IntelliJ IDEA" }, // Uses "nosplash" instead
  pycharm: { command: "pycharm", name: "PyCharm" }, // Uses "nosplash" instead
};

/**
 * Check if an IDE command is available in PATH
 *
 * @param command - Command to check (e.g., "code", "cursor")
 * @returns true if command is available in PATH
 */
export function isIDEAvailable(command: string): boolean {
  const path = Bun.which(command);
  return path !== null;
}

/**
 * Detect all available IDEs on the system
 *
 * Checks for CLI commands in PATH:
 * - code (VSCode)
 * - cursor (Cursor)
 * - webstorm (WebStorm)
 * - idea (IntelliJ IDEA)
 * - pycharm (PyCharm)
 *
 * @returns Array of available IDEs with metadata
 */
export function detectAvailableIDEs(): IDEInfo[] {
  const ides: IDEInfo[] = [];

  for (const config of Object.values(IDE_CONFIG)) {
    const available = isIDEAvailable(config.command);
    if (available) {
      const args: string[] = [];
      if (config.newWindowFlag) {
        args.push(config.newWindowFlag);
      } else {
        // JetBrains IDEs use "nosplash" flag
        args.push("nosplash");
      }

      ides.push({
        name: config.name,
        command: config.command,
        args,
        available: true,
      });
    }
  }

  return ides;
}

/**
 * Get IDE command and args for launching
 *
 * @param editor - IDE to launch
 * @param worktreePath - Absolute path to worktree
 * @param newWindow - Open in new window
 * @returns Command and args array (e.g., ["code", "-n", "/path/to/worktree"])
 */
export function getIDECommand(
  editor: IDEEditor,
  worktreePath: string,
  newWindow: boolean
): string[] {
  const config = IDE_CONFIG[editor];
  if (!config) {
    throw new Error(`Unknown IDE editor: ${editor}`);
  }

  const command: string[] = [config.command];

  // Add flags based on IDE type and newWindow preference
  if (config.newWindowFlag) {
    // VSCode/Cursor: use -n flag for new window
    if (newWindow) {
      command.push(config.newWindowFlag);
    }
  } else {
    // JetBrains IDEs: always use nosplash (no new window flag)
    command.push("nosplash");
  }

  command.push(worktreePath);

  return command;
}

/**
 * Launch IDE with worktree as workspace
 *
 * This function:
 * 1. Checks if IDE command is available
 * 2. Constructs appropriate command with args
 * 3. Spawns IDE process (detached, doesn't wait)
 * 4. Returns immediately with result
 *
 * @param options - IDE launch options
 * @returns Result of launch operation
 */
export function launchIDE(options: LaunchIDEOptions): LaunchIDEResult {
  const { worktreePath, editor, newWindow = true } = options;

  // Check if IDE is available
  const config = IDE_CONFIG[editor];
  if (!config) {
    return {
      success: false,
      editor,
      command: "",
      error: `Unknown IDE editor: ${editor}`,
    };
  }

  const available = isIDEAvailable(config.command);
  if (!available) {
    return {
      success: false,
      editor,
      command: config.command,
      error: `IDE '${config.name}' (command: ${config.command}) is not available in PATH. Please install ${config.name} or add it to your PATH environment variable.`,
    };
  }

  // Construct command
  const commandArray = getIDECommand(editor, worktreePath, newWindow);
  const commandString = commandArray.join(" ");

  try {
    // Spawn IDE process (detached, doesn't wait for it to close)
    Bun.spawn(commandArray, {
      cwd: worktreePath,
      stdio: ["ignore", "ignore", "ignore"],
      // Detach the process so it continues after parent exits
      onExit: undefined,
    });

    // Don't wait for the process to finish - return immediately
    // The IDE will continue running in the background

    return {
      success: true,
      editor,
      command: commandString,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      success: false,
      editor,
      command: commandString,
      error: `Failed to launch IDE '${config.name}': ${errorMessage}. The IDE command may not be in your PATH, or the worktree path may be invalid.`,
    };
  }
}
