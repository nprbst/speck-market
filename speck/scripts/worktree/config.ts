/**
 * Configuration Management for Worktree Integration
 *
 * This module handles loading, saving, and migrating Speck configuration.
 */

import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import {
  type SpeckConfig,
  DEFAULT_SPECK_CONFIG,
  validateSpeckConfig,
} from "./config-schema";

const CONFIG_FILENAME = "config.json";
const SPECK_DIR = ".speck";

/**
 * Get the path to the configuration file
 *
 * @param repoPath - Absolute path to repository root
 * @returns Absolute path to .speck/config.json
 */
function getConfigPath(repoPath: string): string {
  return join(repoPath, SPECK_DIR, CONFIG_FILENAME);
}

/**
 * Load Speck configuration from disk with validation
 *
 * @param repoPath - Absolute path to repository root
 * @returns Validated SpeckConfig with defaults applied
 * @throws Error if config exists but is invalid
 */
export async function loadConfig(repoPath: string): Promise<SpeckConfig> {
  const configPath = getConfigPath(repoPath);

  // If config doesn't exist, return defaults
  if (!existsSync(configPath)) {
    return DEFAULT_SPECK_CONFIG;
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const rawConfig: unknown = JSON.parse(content);

    // Validate and apply defaults
    return validateSpeckConfig(rawConfig);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to parse configuration file at ${configPath}: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Save Speck configuration to disk with validation
 *
 * @param repoPath - Absolute path to repository root
 * @param config - SpeckConfig to save
 * @throws Error if config is invalid or write fails
 */
export async function saveConfig(
  repoPath: string,
  config: SpeckConfig
): Promise<void> {
  // Validate config before saving
  const validatedConfig = validateSpeckConfig(config);

  const speckDir = join(repoPath, SPECK_DIR);
  const configPath = getConfigPath(repoPath);

  // Ensure .speck directory exists
  if (!existsSync(speckDir)) {
    await mkdir(speckDir, { recursive: true });
  }

  // Write config with pretty formatting
  const content = JSON.stringify(validatedConfig, null, 2) + "\n";
  await writeFile(configPath, content, "utf-8");
}

/**
 * Migrate configuration from older versions to current schema
 *
 * @param repoPath - Absolute path to repository root
 * @returns true if migration was performed, false if already current
 * @throws Error if migration fails
 */
export async function migrateConfig(repoPath: string): Promise<boolean> {
  const configPath = getConfigPath(repoPath);

  // If config doesn't exist, no migration needed
  if (!existsSync(configPath)) {
    return false;
  }

  try {
    const content = await readFile(configPath, "utf-8");
    const rawConfig: unknown = JSON.parse(content);

    // Check if migration is needed (version mismatch)
    const currentVersion = (rawConfig as { version?: string }).version;
    const targetVersion = "1.0";

    if (currentVersion === targetVersion) {
      // Already at current version
      return false;
    }

    // Apply migration logic here (currently only version 1.0 exists)
    // Future versions would add migration steps here

    // Validate and save migrated config
    const migratedConfig = validateSpeckConfig(rawConfig);
    await saveConfig(repoPath, migratedConfig);

    return true;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Failed to migrate configuration: Invalid JSON in ${configPath}`
      );
    }
    throw error;
  }
}
