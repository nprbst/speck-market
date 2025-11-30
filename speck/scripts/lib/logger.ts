/**
 * Logging utility for dual-mode CLI operation
 * Provides mode-aware logging with debug mode support
 */

import type { ExecutionMode } from "./types";

/**
 * Log levels for filtering
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  level: LogLevel;
  mode: ExecutionMode;
  enableColors: boolean;
  enableTimestamps: boolean;
}

/**
 * Default logger configuration
 */
const defaultConfig: LoggerConfig = {
  level: LogLevel.INFO,
  mode: "cli",
  enableColors: true,
  enableTimestamps: false,
};

/**
 * Current logger configuration
 */
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };

  // Disable colors in hook mode or if not TTY
  if (currentConfig.mode === "hook" || !process.stderr.isTTY) {
    currentConfig.enableColors = false;
  }
}

/**
 * Get current log level from environment variable or config
 */
function getLogLevel(): LogLevel {
  const envLevel = process.env.SPECK_LOG_LEVEL;
  if (envLevel) {
    const level = LogLevel[envLevel.toUpperCase() as keyof typeof LogLevel];
    if (level !== undefined) {
      return level;
    }
  }
  return currentConfig.level;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return getLogLevel() <= LogLevel.DEBUG;
}

/**
 * Format log message with optional timestamp and color
 */
function formatMessage(
  level: LogLevel,
  message: string,
  data?: unknown
): string {
  let formatted = "";

  // Add timestamp if enabled
  if (currentConfig.enableTimestamps) {
    const timestamp = new Date().toISOString();
    formatted += `[${timestamp}] `;
  }

  // Add level prefix with color if enabled
  const levelName = LogLevel[level];
  if (currentConfig.enableColors) {
    const colorCode = getLevelColor(level);
    formatted += `${colorCode}${levelName}\x1b[0m: `;
  } else {
    formatted += `${levelName}: `;
  }

  // Add message
  formatted += message;

  // Add data if provided
  if (data !== undefined) {
    formatted += ` ${JSON.stringify(data)}`;
  }

  return formatted;
}

/**
 * Get ANSI color code for log level
 */
function getLevelColor(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return "\x1b[90m"; // Gray
    case LogLevel.INFO:
      return "\x1b[36m"; // Cyan
    case LogLevel.WARN:
      return "\x1b[33m"; // Yellow
    case LogLevel.ERROR:
      return "\x1b[31m"; // Red
    default:
      return "\x1b[0m"; // Reset
  }
}

/**
 * Log a debug message (only in debug mode)
 */
export function debug(message: string, data?: unknown): void {
  if (getLogLevel() <= LogLevel.DEBUG) {
    const formatted = formatMessage(LogLevel.DEBUG, message, data);
    console.error(formatted); // Use stderr for debug messages
  }
}

/**
 * Log an info message
 */
export function info(message: string, data?: unknown): void {
  if (getLogLevel() <= LogLevel.INFO) {
    const formatted = formatMessage(LogLevel.INFO, message, data);
    // Use stderr in hook mode to avoid polluting JSON output
    if (currentConfig.mode === "hook") {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}

/**
 * Log a warning message
 */
export function warn(message: string, data?: unknown): void {
  if (getLogLevel() <= LogLevel.WARN) {
    const formatted = formatMessage(LogLevel.WARN, message, data);
    console.error(formatted);
  }
}

/**
 * Log an error message
 */
export function error(message: string, data?: unknown): void {
  if (getLogLevel() <= LogLevel.ERROR) {
    const formatted = formatMessage(LogLevel.ERROR, message, data);
    console.error(formatted);
  }
}

/**
 * Create a scoped logger with a prefix
 */
export function createScopedLogger(scope: string): {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
} {
  return {
    debug: (message: string, data?: unknown): void =>
      debug(`[${scope}] ${message}`, data),
    info: (message: string, data?: unknown): void => info(`[${scope}] ${message}`, data),
    warn: (message: string, data?: unknown): void => warn(`[${scope}] ${message}`, data),
    error: (message: string, data?: unknown): void =>
      error(`[${scope}] ${message}`, data),
  };
}

/**
 * Log function execution time (for debugging performance)
 */
export async function logExecutionTime<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!isDebugEnabled()) {
    return fn();
  }

  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    debug(`${label} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    debug(`${label} failed after ${duration.toFixed(2)}ms`);
    throw error;
  }
}
