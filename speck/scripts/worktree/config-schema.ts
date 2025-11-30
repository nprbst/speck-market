/**
 * Configuration Schema for Worktree Integration
 *
 * This file defines TypeScript interfaces and Zod schemas for worktree configuration.
 * Schemas provide runtime validation with compile-time type inference.
 *
 * Storage: .speck/config.json (per repository)
 * Version: 1.0 (spec 012)
 */

import { z } from "zod";

// ============================================================================
// Zod Schemas (Runtime Validation)
// ============================================================================

/**
 * File rule: defines how a file/directory should be handled in worktrees
 */
export const FileRuleSchema = z.object({
  pattern: z.string().min(1, "Pattern cannot be empty"),
  action: z.enum(["copy", "symlink", "ignore"], {
    errorMap: () => ({ message: "Action must be 'copy', 'symlink', or 'ignore'" })
  }),
});

/**
 * File configuration: rules for file/directory operations
 */
export const FileConfigSchema = z.object({
  rules: z.array(FileRuleSchema).default([]),
  includeUntracked: z.boolean().default(true),
}).default({});

/**
 * Dependency configuration: package installation settings
 */
export const DependencyConfigSchema = z.object({
  autoInstall: z.boolean().default(false),
  packageManager: z.enum(["npm", "yarn", "pnpm", "bun", "auto"], {
    errorMap: () => ({ message: "Package manager must be 'npm', 'yarn', 'pnpm', 'bun', or 'auto'" })
  }).default("auto"),
}).default({});

/**
 * IDE configuration: auto-launch and editor preferences
 */
export const IDEConfigSchema = z.object({
  autoLaunch: z.boolean().default(false),
  editor: z.enum(["vscode", "cursor", "webstorm", "idea", "pycharm"], {
    errorMap: () => ({ message: "Editor must be one of: vscode, cursor, webstorm, idea, pycharm" })
  }).default("vscode"),
  newWindow: z.boolean().default(true),
}).default({});

/**
 * Worktree configuration: all worktree integration settings
 */
export const WorktreeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  worktreePath: z.string().default("../"),
  branchPrefix: z.string().optional(),
  ide: IDEConfigSchema,
  dependencies: DependencyConfigSchema,
  files: FileConfigSchema,
}).default({});

/**
 * Root Speck configuration: top-level config object
 */
export const SpeckConfigSchema = z.object({
  version: z.string().default("1.0"),
  worktree: WorktreeConfigSchema,
});

// ============================================================================
// TypeScript Types (Compile-time Type Safety)
// ============================================================================

/**
 * Inferred from FileRuleSchema
 */
export type FileRule = z.infer<typeof FileRuleSchema>;

/**
 * Inferred from FileConfigSchema
 */
export type FileConfig = z.infer<typeof FileConfigSchema>;

/**
 * Inferred from DependencyConfigSchema
 */
export type DependencyConfig = z.infer<typeof DependencyConfigSchema>;

/**
 * Inferred from IDEConfigSchema
 */
export type IDEConfig = z.infer<typeof IDEConfigSchema>;

/**
 * Inferred from WorktreeConfigSchema
 */
export type WorktreeConfig = z.infer<typeof WorktreeConfigSchema>;

/**
 * Inferred from SpeckConfigSchema
 */
export type SpeckConfig = z.infer<typeof SpeckConfigSchema>;

// ============================================================================
// Default Values (Reusable Constants)
// ============================================================================

/**
 * Default worktree configuration (worktree enabled by default)
 *
 * File rules are included directly so they appear in generated config.json,
 * making them visible and editable by users.
 */
export const DEFAULT_WORKTREE_CONFIG: WorktreeConfig = {
  enabled: true,
  worktreePath: "../",
  ide: {
    autoLaunch: false,
    editor: "vscode",
    newWindow: true,
  },
  dependencies: {
    autoInstall: false,
    packageManager: "auto",
  },
  files: {
    rules: [
      // Copy configuration files (isolation per worktree)
      { pattern: ".env*", action: "copy" },
      { pattern: "*.config.js", action: "copy" },
      { pattern: "*.config.ts", action: "copy" },
      { pattern: "*.config.json", action: "copy" },
      { pattern: ".nvmrc", action: "copy" },
      { pattern: ".node-version", action: "copy" },
      // Claude Code local settings (untracked, machine-specific)
      { pattern: ".claude/settings.local.json", action: "copy" },

      // Symlink large dependency directories (shared across worktrees)
      { pattern: "node_modules", action: "symlink" },
      { pattern: ".bun", action: "symlink" },
      { pattern: ".cache", action: "symlink" },

      // Ignore (don't copy or symlink - handled by git or not needed)
      { pattern: ".git", action: "ignore" },
      { pattern: ".speck", action: "ignore" },
      { pattern: "dist", action: "ignore" },
      { pattern: "build", action: "ignore" },
    ],
    includeUntracked: true,
  },
};

/**
 * Default Speck configuration
 */
export const DEFAULT_SPECK_CONFIG: SpeckConfig = {
  version: "1.0",
  worktree: DEFAULT_WORKTREE_CONFIG,
};

// ============================================================================
// Helper Types (Not in config, but useful for implementation)
// ============================================================================

/**
 * Supported package managers (detected from lockfiles or explicitly configured)
 * "auto" means auto-detect from lockfiles
 */
export type PackageManager = "bun" | "pnpm" | "yarn" | "npm" | "auto";

/**
 * Supported IDE editors
 */
export type IDEEditor = "vscode" | "cursor" | "webstorm" | "idea" | "pycharm";

/**
 * Worktree lifecycle states (runtime only, not persisted)
 */
export type WorktreeState =
  | "creating"           // Git worktree add in progress
  | "copying_files"      // Applying file rules
  | "installing_deps"    // Installing dependencies
  | "ready"              // Ready for use
  | "error";             // Creation failed

/**
 * Worktree metadata (runtime only, not persisted in config)
 */
export interface WorktreeMetadata {
  branchName: string;
  worktreePath: string;
  createdAt: string; // ISO 8601
  status: WorktreeState;
  parentRepo: string;
}

/**
 * Branch metadata (could extend .speck/branches.json from spec 008/009)
 */
export interface BranchMetadata {
  branchName: string;
  hasWorktree: boolean;
  worktreePath?: string; // Relative to repo root
  specNumber: string;    // e.g., "002"
  shortName: string;     // e.g., "user-auth"
}

/**
 * IDE information (for detection and availability)
 */
export interface IDEInfo {
  name: string;          // Display name (e.g., "VSCode")
  command: string;       // CLI command (e.g., "code")
  args: string[];        // Default args (e.g., ["-n"] for new window)
  available: boolean;    // Whether command is in PATH
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate and parse Speck configuration with detailed error messages
 *
 * @param data - Raw JSON data from config file
 * @returns Validated SpeckConfig with defaults applied
 * @throws Error with detailed validation messages if invalid
 */
export function validateSpeckConfig(data: unknown): SpeckConfig {
  try {
    return SpeckConfigSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors
        .map(err => `  - ${err.path.join(".")}: ${err.message}`)
        .join("\n");

      throw new Error(
        `Invalid configuration in .speck/config.json:\n${messages}`
      );
    }
    throw error;
  }
}

/**
 * Merge user config with defaults (safe parsing with defaults)
 *
 * @param userConfig - Partial user configuration
 * @returns Complete SpeckConfig with defaults applied
 */
export function mergeWithDefaults(userConfig: Partial<SpeckConfig>): SpeckConfig {
  return SpeckConfigSchema.parse(userConfig);
}

/**
 * Check if worktree integration is enabled in config
 *
 * @param config - Speck configuration
 * @returns true if worktree.enabled is true
 */
export function isWorktreeEnabled(config: SpeckConfig): boolean {
  return config.worktree?.enabled ?? true;
}

/**
 * Get file rules from configuration
 *
 * @param config - Speck configuration
 * @returns Array of file rules
 */
export function getFileRules(config: SpeckConfig): FileRule[] {
  return config.worktree?.files?.rules ?? [];
}
