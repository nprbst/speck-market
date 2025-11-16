#!/usr/bin/env bun

/**
 * Create New Feature Script
 *
 * Bun TypeScript implementation of create-new-feature.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.85/.specify/scripts/bash/create-new-feature.sh
 * Strategy: Pure TypeScript (file ops, string manipulation) + Bun Shell API (git commands)
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" to cd command for SCRIPT_DIR (security fix)
 * - TypeScript implementation already immune: uses import.meta.dir instead of cd
 * - No code changes needed, only documentation updated to track v0.0.85
 *
 * CLI Interface:
 * - Flags: --json, --short-name <name>, --number N, --help
 * - Exit Codes: 0 (success), 1 (user error)
 * - JSON Output: { BRANCH_NAME, SPEC_FILE, FEATURE_NUM }
 *
 * Transformation Rationale:
 * - Replaced bash string manipulation with native TypeScript
 * - Replaced git commands with Bun Shell API
 * - Replaced bash loops with TypeScript for...of loops
 * - Preserved all CLI flags and argument parsing logic
 */

import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";
import { ExitCode } from "./contracts/cli-interface";

/**
 * CLI options for create-new-feature
 */
interface CreateFeatureOptions {
  json: boolean;
  shortName?: string;
  number?: number;
  help: boolean;
  featureDescription: string;
}

/**
 * JSON output for create-new-feature
 */
interface CreateFeatureOutput {
  BRANCH_NAME: string;
  SPEC_FILE: string;
  FEATURE_NUM: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CreateFeatureOptions {
  const options: CreateFeatureOptions = {
    json: false,
    help: false,
    featureDescription: "",
  };

  const positionalArgs: string[] = [];
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === "--json") {
      options.json = true;
      i++;
    } else if (arg === "--short-name") {
      if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
        console.error("Error: --short-name requires a value");
        process.exit(ExitCode.USER_ERROR);
      }
      options.shortName = args[i + 1];
      i += 2;
    } else if (arg === "--number") {
      if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
        console.error("Error: --number requires a value");
        process.exit(ExitCode.USER_ERROR);
      }
      const num = parseInt(args[i + 1], 10);
      if (isNaN(num)) {
        console.error("Error: --number requires a numeric value");
        process.exit(ExitCode.USER_ERROR);
      }
      options.number = num;
      i += 2;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
      i++;
    } else {
      positionalArgs.push(arg);
      i++;
    }
  }

  options.featureDescription = positionalArgs.join(" ");
  return options;
}

/**
 * Show help message
 */
function showHelp(): void {
  const scriptName = path.basename(process.argv[1]);
  console.log(`Usage: ${scriptName} [--json] [--short-name <name>] [--number N] <feature_description>

Options:
  --json              Output in JSON format
  --short-name <name> Provide a custom short name (2-4 words) for the branch
  --number N          Specify branch number manually (overrides auto-detection)
  --help, -h          Show this help message

Examples:
  ${scriptName} 'Add user authentication system' --short-name 'user-auth'
  ${scriptName} 'Implement OAuth2 integration for API' --number 5`);
}

/**
 * Find repository root by searching for project markers
 */
function findRepoRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(path.join(dir, ".git")) || existsSync(path.join(dir, ".specify")) || existsSync(path.join(dir, ".speck"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Get highest number from specs directory
 */
function getHighestFromSpecs(specsDir: string): number {
  let highest = 0;

  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(/^(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highest) {
            highest = num;
          }
        }
      }
    }
  }

  return highest;
}

/**
 * Get highest number from git branches
 */
async function getHighestFromBranches(): Promise<number> {
  let highest = 0;

  try {
    const result = await $`git branch -a`.quiet();
    const branches = result.text().split("\n");

    for (const branch of branches) {
      // Clean branch name: remove leading markers and remote prefixes
      const cleanBranch = branch
        .replace(/^[* ]+/, "")
        .replace(/^remotes\/[^/]+\//, "");

      // Extract feature number if branch matches pattern ###-*
      const match = cleanBranch.match(/^(\d{3})-/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highest) {
          highest = num;
        }
      }
    }
  } catch {
    // Git not available or no branches
  }

  return highest;
}

/**
 * Check existing branches and return next available number
 */
async function checkExistingBranches(shortName: string, specsDir: string): Promise<number> {
  // Fetch all remotes to get latest branch info
  try {
    await $`git fetch --all --prune`.quiet();
  } catch {
    // Ignore fetch errors
  }

  let maxNum = 0;

  // Check remote branches
  try {
    const result = await $`git ls-remote --heads origin`.quiet();
    const lines = result.text().split("\n");
    for (const line of lines) {
      const match = line.match(new RegExp(`refs/heads/(\\d+)-${shortName}$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  } catch {
    // No remote or ls-remote failed
  }

  // Check local branches
  try {
    const result = await $`git branch`.quiet();
    const branches = result.text().split("\n");
    for (const branch of branches) {
      const match = branch.match(new RegExp(`^[* ]*?(\\d+)-${shortName}$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }
  } catch {
    // Git not available
  }

  // Check specs directory
  if (existsSync(specsDir)) {
    const dirs = readdirSync(specsDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const match = dir.name.match(new RegExp(`^(\\d+)-${shortName}$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }

  return maxNum + 1;
}

/**
 * Clean and format a branch name
 */
function cleanBranchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
}

/**
 * Generate branch name with stop word filtering
 */
function generateBranchName(description: string): string {
  // Common stop words to filter out
  const stopWords = new Set([
    "i", "a", "an", "the", "to", "for", "of", "in", "on", "at", "by",
    "with", "from", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "should",
    "could", "can", "may", "might", "must", "shall", "this", "that",
    "these", "those", "my", "your", "our", "their", "want", "need",
    "add", "get", "set",
  ]);

  // Convert to lowercase and split into words
  const cleanName = description.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const words = cleanName.split(/\s+/).filter((w) => w.length > 0);

  // Filter words: remove stop words and short words (unless they look like acronyms)
  const meaningfulWords: string[] = [];
  for (const word of words) {
    if (stopWords.has(word)) {
      continue;
    }

    // Keep words that are >= 3 chars OR appear as uppercase in original (likely acronyms)
    if (word.length >= 3) {
      meaningfulWords.push(word);
    } else {
      const upperWord = word.toUpperCase();
      if (description.includes(upperWord)) {
        meaningfulWords.push(word);
      }
    }
  }

  // Use first 3-4 meaningful words
  if (meaningfulWords.length > 0) {
    const maxWords = meaningfulWords.length === 4 ? 4 : 3;
    return meaningfulWords.slice(0, maxWords).join("-");
  }

  // Fallback: use cleaned description (first 3 words)
  const cleaned = cleanBranchName(description);
  return cleaned
    .split("-")
    .filter((w) => w.length > 0)
    .slice(0, 3)
    .join("-");
}

/**
 * Main function
 */
async function main(args: string[]): Promise<number> {
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return ExitCode.SUCCESS;
  }

  if (!options.featureDescription) {
    console.error("Usage: create-new-feature [--json] [--short-name <name>] [--number N] <feature_description>");
    return ExitCode.USER_ERROR;
  }

  // Resolve repository root
  let repoRoot: string;
  let hasGit = false;

  try {
    const result = await $`git rev-parse --show-toplevel`.quiet();
    repoRoot = result.text().trim();
    hasGit = true;
  } catch {
    const scriptDir = import.meta.dir;
    const foundRoot = findRepoRoot(scriptDir);
    if (!foundRoot) {
      console.error("Error: Could not determine repository root. Please run this script from within the repository.");
      return ExitCode.USER_ERROR;
    }
    repoRoot = foundRoot;
    hasGit = false;
  }

  const specsDir = path.join(repoRoot, "specs");
  mkdirSync(specsDir, { recursive: true });

  // Generate branch name
  let branchSuffix: string;
  if (options.shortName) {
    branchSuffix = cleanBranchName(options.shortName);
  } else {
    branchSuffix = generateBranchName(options.featureDescription);
  }

  // Determine branch number
  let branchNumber: number;
  if (options.number !== undefined) {
    branchNumber = options.number;
  } else if (hasGit) {
    branchNumber = await checkExistingBranches(branchSuffix, specsDir);
  } else {
    const highest = getHighestFromSpecs(specsDir);
    branchNumber = highest + 1;
  }

  const featureNum = branchNumber.toString().padStart(3, "0");
  let branchName = `${featureNum}-${branchSuffix}`;

  // GitHub enforces a 244-byte limit on branch names
  const maxBranchLength = 244;
  if (branchName.length > maxBranchLength) {
    const maxSuffixLength = maxBranchLength - 4; // 3 digits + hyphen
    const truncatedSuffix = branchSuffix.substring(0, maxSuffixLength).replace(/-$/, "");

    console.error(`[specify] Warning: Branch name exceeded GitHub's 244-byte limit`);
    console.error(`[specify] Original: ${branchName} (${branchName.length} bytes)`);

    branchName = `${featureNum}-${truncatedSuffix}`;
    console.error(`[specify] Truncated to: ${branchName} (${branchName.length} bytes)`);
  }

  // Create git branch if we have git
  if (hasGit) {
    try {
      await $`git checkout -b ${branchName}`;
    } catch (error) {
      console.error(`Error: Failed to create git branch: ${error}`);
      return ExitCode.USER_ERROR;
    }
  } else {
    console.error(`[specify] Warning: Git repository not detected; skipped branch creation for ${branchName}`);
  }

  // Create feature directory
  const featureDir = path.join(specsDir, branchName);
  mkdirSync(featureDir, { recursive: true });

  // Copy template if it exists
  const template = path.join(repoRoot, ".specify/templates/spec-template.md");
  const specFile = path.join(featureDir, "spec.md");
  if (existsSync(template)) {
    copyFileSync(template, specFile);
  } else {
    // Create empty spec file
    await Bun.write(specFile, "");
  }

  // Set SPECIFY_FEATURE environment variable (note: this only affects this process)
  process.env.SPECIFY_FEATURE = branchName;

  // Output results
  if (options.json) {
    const output: CreateFeatureOutput = {
      BRANCH_NAME: branchName,
      SPEC_FILE: specFile,
      FEATURE_NUM: featureNum,
    };
    console.log(JSON.stringify(output));
  } else {
    console.log(`BRANCH_NAME: ${branchName}`);
    console.log(`SPEC_FILE: ${specFile}`);
    console.log(`FEATURE_NUM: ${featureNum}`);
    console.log(`SPECIFY_FEATURE environment variable set to: ${branchName}`);
  }

  return ExitCode.SUCCESS;
}

/**
 * Entry point
 */
if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
