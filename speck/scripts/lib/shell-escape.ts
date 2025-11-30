/**
 * Shell escaping utility for safe command construction
 *
 * NOTE: As of the POC implementation, hook output uses cat with heredoc (zero escaping needed).
 * This utility is kept available for other use cases where shell command construction
 * requires escaping (e.g., building dynamic shell commands, argument passing).
 *
 * Per research.md decision 4: POSIX single-quote escaping pattern
 */

/**
 * Escape single quotes in text for safe use in single-quoted shell strings
 *
 * In POSIX shells, single quotes preserve everything literally except single quotes themselves.
 * To include a single quote, we must: close the quote, add escaped quote, reopen quote.
 *
 * Pattern: 'text with 'quotes'' → 'text with '\''quotes'\'''
 *
 * @param text - Text to escape
 * @returns Escaped text safe for wrapping in single quotes
 *
 * @example
 * ```typescript
 * const msg = "It's working";
 * const escaped = escapeSingleQuotes(msg);
 * // escaped === "It'\\''s working"
 * // Shell command: echo 'It'\''s working'
 * // Output: It's working
 * ```
 */
export function escapeSingleQuotes(text: string): string {
  return text.replace(/'/g, "'\\''");
}

/**
 * Escape text and wrap in single quotes for shell command
 *
 * @param text - Text to escape and quote
 * @returns Shell-safe single-quoted string
 *
 * @example
 * ```typescript
 * const msg = "Hello 'world'";
 * const quoted = quote(msg);
 * // quoted === "'Hello '\\''world'\\'''"
 * ```
 */
export function quote(text: string): string {
  return `'${escapeSingleQuotes(text)}'`;
}
