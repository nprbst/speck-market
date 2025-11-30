#!/usr/bin/env bun

/**
 * CLI Command: speck worktree init
 *
 * Interactive setup wizard for worktree configuration.
 * Provides guided prompts for easy configuration or quick defaults.
 */

import { loadConfig, saveConfig } from "./config";
import { detectAvailableIDEs } from "./ide-launch";
import { detectPackageManager } from "./deps-install";
import type { SpeckConfig, IDEConfig, DependencyConfig, FileRule } from "./config-schema";
import { WorktreeError } from "./errors";

export interface InitCommandOptions {
  repoPath: string;
  defaults?: boolean;
  minimal?: boolean;
  json?: boolean;
}

/**
 * Execute the init command
 */
export async function executeInitCommand(
  options: InitCommandOptions
): Promise<void> {
  const { repoPath, defaults, minimal, json } = options;

  try {
    // Load existing configuration (if any)
    const existingConfig = await loadConfig(repoPath);

    let newConfig: SpeckConfig;

    if (defaults) {
      // Apply default configuration with auto-detected values
      newConfig = await createDefaultConfig(repoPath);
      if (!json) {
        console.log("✓ Created worktree configuration with default values");
      }
    } else if (minimal) {
      // Apply minimal configuration (worktree enabled, everything else disabled)
      newConfig = createMinimalConfig();
      if (!json) {
        console.log("✓ Created minimal worktree configuration");
      }
    } else {
      // Interactive mode: prompt user for each setting
      newConfig = await createInteractiveConfig(repoPath, existingConfig);
    }

    // Save configuration
    await saveConfig(repoPath, newConfig);

    // Output results
    if (json) {
      console.log(
        JSON.stringify(
          {
            success: true,
            config: newConfig,
            mode: defaults ? "defaults" : minimal ? "minimal" : "interactive",
          },
          null,
          2
        )
      );
    } else {
      console.log(`\n✓ Configuration saved to .speck/config.json`);
      if (!defaults && !minimal) {
        console.log("\nYou can now create worktrees with:");
        console.log("  /speck:specify <feature-name>");
        console.log("  /speck:branch create <branch-name>");
      }
    }
  } catch (error) {
    if (json) {
      console.log(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    } else {
      if (error instanceof WorktreeError) {
        console.error(`✗ ${error.message}`);
        if (error.cause) {
          console.error(`  Cause: ${String(error.cause)}`);
        }
      } else {
        console.error(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    process.exit(1);
  }
}

/**
 * Create default configuration with auto-detected values
 */
async function createDefaultConfig(repoPath: string): Promise<SpeckConfig> {
  const availableIDEs = detectAvailableIDEs();
  const packageManager = await detectPackageManager(repoPath);

  // Map IDE command to IDEEditor type
  const getIDEEditor = (command: string): IDEConfig["editor"] => {
    const mapping: Record<string, IDEConfig["editor"]> = {
      code: "vscode",
      cursor: "cursor",
      webstorm: "webstorm",
      idea: "idea",
      pycharm: "pycharm",
    };
    return mapping[command] || "vscode";
  };

  const ideConfig: IDEConfig = {
    autoLaunch: availableIDEs.length > 0,
    editor: availableIDEs.length > 0 ? getIDEEditor(availableIDEs[0]!.command) : "vscode",
    newWindow: true,
  };

  const depsConfig: DependencyConfig = {
    autoInstall: packageManager !== null,
    packageManager: packageManager || "auto",
  };

  const defaultFileRules: FileRule[] = [
    { pattern: ".env*", action: "copy" },
    { pattern: "node_modules", action: "symlink" },
    { pattern: ".git", action: "ignore" },
  ];

  return {
    version: "1.0",
    worktree: {
      enabled: true,
      worktreePath: ".speck/worktrees",
      branchPrefix: undefined,
      ide: ideConfig,
      dependencies: depsConfig,
      files: {
        rules: defaultFileRules,
        includeUntracked: true,
      },
    },
  };
}

/**
 * Create minimal configuration (worktree enabled only)
 */
function createMinimalConfig(): SpeckConfig {
  return {
    version: "1.0",
    worktree: {
      enabled: true,
      worktreePath: ".speck/worktrees",
      branchPrefix: undefined,
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
        rules: [],
        includeUntracked: true,
      },
    },
  };
}

/**
 * Create configuration through interactive prompts
 */
async function createInteractiveConfig(
  repoPath: string,
  existingConfig: SpeckConfig
): Promise<SpeckConfig> {
  console.log("\n🔧 Speck Worktree Setup Wizard\n");
  console.log("Press Ctrl+C to cancel at any time.\n");

  // Detect available options
  const availableIDEs = detectAvailableIDEs();
  const detectedPackageManager = await detectPackageManager(repoPath);

  // Enable worktree integration
  const enabled = await promptBoolean(
    "Enable worktree integration?",
    existingConfig.worktree?.enabled ?? true
  );

  if (!enabled) {
    console.log("\n⚠ Worktree integration will be disabled.");
    return {
      version: "1.0",
      worktree: {
        enabled: false,
        worktreePath: ".speck/worktrees",
        ide: { autoLaunch: false, editor: "vscode", newWindow: true },
        dependencies: { autoInstall: false, packageManager: "auto" },
        files: { rules: [], includeUntracked: true },
      },
    };
  }

  // Worktree path
  const worktreePath = await promptString(
    "Worktree directory path (relative to repository root)?",
    existingConfig.worktree?.worktreePath ?? ".speck/worktrees"
  );

  // Branch prefix (optional)
  const useBranchPrefix = await promptBoolean(
    "Use a branch prefix (e.g., username/feature-name)?",
    existingConfig.worktree?.branchPrefix !== undefined
  );

  const branchPrefix = useBranchPrefix
    ? await promptString("Branch prefix?", existingConfig.worktree?.branchPrefix ?? "")
    : undefined;

  // IDE auto-launch
  const autoLaunchIDE = await promptBoolean(
    "Auto-launch IDE when creating worktrees?",
    existingConfig.worktree?.ide?.autoLaunch ?? (availableIDEs.length > 0)
  );

  let ideEditor: IDEConfig["editor"] = "vscode";
  if (autoLaunchIDE && availableIDEs.length > 0) {
    console.log(`\nDetected IDEs: ${availableIDEs.join(", ")}`);
    ideEditor = (await promptString(
      "Preferred IDE?",
      existingConfig.worktree?.ide?.editor ?? availableIDEs[0]
    )) as IDEConfig["editor"];
  }

  const newWindow = await promptBoolean(
    "Open IDE in new window?",
    existingConfig.worktree?.ide?.newWindow ?? true
  );

  // Dependency auto-install
  const autoInstall = await promptBoolean(
    "Auto-install dependencies in worktrees?",
    existingConfig.worktree?.dependencies?.autoInstall ?? (detectedPackageManager !== null)
  );

  let packageManager: DependencyConfig["packageManager"] = "auto";
  if (autoInstall) {
    if (detectedPackageManager) {
      console.log(`\nDetected package manager: ${detectedPackageManager}`);
    }
    packageManager = (await promptString(
      "Package manager (npm, yarn, pnpm, bun, auto)?",
      existingConfig.worktree?.dependencies?.packageManager ?? detectedPackageManager ?? "auto"
    )) as DependencyConfig["packageManager"];
  }

  // File rules
  const useDefaultFileRules = await promptBoolean(
    "Use default file rules (.env copy, node_modules symlink)?",
    true
  );

  const fileRules: FileRule[] = useDefaultFileRules
    ? [
        { pattern: ".env*", action: "copy" },
        { pattern: "node_modules", action: "symlink" },
        { pattern: ".git", action: "ignore" },
      ]
    : existingConfig.worktree?.files?.rules ?? [];

  const includeUntracked = await promptBoolean(
    "Include untracked files in worktrees?",
    existingConfig.worktree?.files?.includeUntracked ?? true
  );

  // Build configuration
  return {
    version: "1.0",
    worktree: {
      enabled: true,
      worktreePath,
      branchPrefix,
      ide: {
        autoLaunch: autoLaunchIDE,
        editor: ideEditor,
        newWindow,
      },
      dependencies: {
        autoInstall,
        packageManager,
      },
      files: {
        rules: fileRules,
        includeUntracked,
      },
    },
  };
}

/**
 * Prompt user for a boolean value
 */
async function promptBoolean(question: string, defaultValue: boolean): Promise<boolean> {
  const defaultText = defaultValue ? "Y/n" : "y/N";
  const response = await promptString(`${question} (${defaultText})`, "");

  if (response === "") {
    return defaultValue;
  }

  const normalized = response.toLowerCase();
  if (normalized === "y" || normalized === "yes") {
    return true;
  }
  if (normalized === "n" || normalized === "no") {
    return false;
  }

  // Invalid input, re-prompt
  console.log("Invalid input. Please enter 'y' or 'n'.");
  return promptBoolean(question, defaultValue);
}

/**
 * Prompt user for a string value
 */
async function promptString(question: string, defaultValue: string): Promise<string> {
  const prompt = defaultValue ? `${question} [${defaultValue}]` : question;
  process.stdout.write(`${prompt}: `);

  // Read input from stdin
  const input = await readLine();

  if (input.trim() === "" && defaultValue) {
    return defaultValue;
  }

  return input.trim();
}

/**
 * Read a line from stdin
 */
async function readLine(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.setRawMode(false);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (data: Buffer): void => {
      stdin.removeListener("data", onData);
      stdin.pause();
      resolve(data.toString().trim());
    };

    stdin.on("data", onData);
  });
}
