/**
 * Argument Parser Utility
 *
 * Converts command strings into argv arrays for Commander.js processing.
 * Handles quoted arguments, preserving them as single elements.
 *
 * @module arg-parser
 */

/**
 * Parses a command string into an argv-compatible array.
 *
 * Examples:
 *   parseCommandToArgv("speck-branch list")
 *     -> ["branch", "list"]
 *
 *   parseCommandToArgv("speck-branch create my-feature --base main")
 *     -> ["branch", "create", "my-feature", "--base", "main"]
 *
 *   parseCommandToArgv('test-hello "hello world"')
 *     -> ["test-hello", "hello world"]
 *
 * @param commandString - The full command string to parse
 * @returns Array of command arguments suitable for Commander.parse()
 */
export function parseCommandToArgv(commandString: string): string[] {
  // Remove leading/trailing whitespace
  const trimmed = commandString.trim();

  if (!trimmed) {
    return [];
  }

  const args: string[] = [];
  let currentArg = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i]!;

    // Handle escape sequences
    if (escaped) {
      currentArg += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    // Handle quotes
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    // Handle spaces (argument separators)
    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (currentArg) {
        args.push(currentArg);
        currentArg = '';
      }
      continue;
    }

    // Add character to current argument
    currentArg += char;
  }

  // Add final argument if present
  if (currentArg) {
    args.push(currentArg);
  }

  // Strip virtual command prefix if present
  // "speck-branch" -> "branch"
  // "test-hello" -> "test-hello" (no change for test commands)
  if (args.length > 0 && args[0]) {
    const firstArg = args[0];
    if (firstArg.startsWith('speck-')) {
      args[0] = firstArg.substring(6); // Remove "speck-" prefix
    }
  }

  return args;
}

/**
 * Extracts command name from a command string.
 *
 * Examples:
 *   extractCommandName("speck-branch list") -> "branch"
 *   extractCommandName("test-hello world") -> "test-hello"
 *
 * @param commandString - The command string to extract from
 * @returns The command name without prefix
 */
export function extractCommandName(commandString: string): string {
  const argv = parseCommandToArgv(commandString);
  return argv[0] || '';
}

/**
 * Checks if a command string represents a virtual Speck command.
 *
 * @param commandString - The command string to check
 * @returns true if command starts with "speck-" or "test-"
 */
export function isVirtualCommand(commandString: string): boolean {
  const trimmed = commandString.trim();
  return trimmed.startsWith('speck-') || trimmed.startsWith('test-');
}
