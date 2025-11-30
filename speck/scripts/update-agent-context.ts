#!/usr/bin/env bun

/**
 * Update Agent Context Script
 *
 * Updates CLAUDE.md with technology stack information from the current feature's plan.
 *
 * Feature: 015-scope-simplification
 *
 * CLI Interface:
 * - No arguments required
 * - Exit Codes: 0 (success), 1 (user error)
 *
 * UPSTREAM VERSION TRACKING:
 * - Based on: update-agent-context.sh from upstream spec-kit
 * - Last synced: v0.0.86 (2025-11-26)
 * - Upstream change in v0.0.86: Added IBM Bob agent support (BOB_FILE variable, bob case handler, all-agents logic)
 * - TypeScript simplification: This implementation is intentionally simplified to ONLY update CLAUDE.md
 *   - Does NOT support multi-agent CLI interface from bash version
 *   - Does NOT accept agent type arguments
 *   - Single-agent focus aligns with Speck's simplified scope
 *   - Upstream multi-agent features (including new "bob" support) are intentionally NOT ported
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getFeaturePaths, getTemplatesDir } from "./common/paths";
import { ExitCode } from "./contracts/cli-interface";

/**
 * Extract plan field by pattern
 */
function extractPlanField(fieldPattern: string, planContent: string): string {
  const regex = new RegExp(`^\\*\\*${fieldPattern}\\*\\*: (.+)$`, "m");
  const match = planContent.match(regex);
  if (!match || !match[1]) return "";

  const value = match[1].trim();
  // Filter out NEEDS CLARIFICATION and N/A
  if (value === "NEEDS CLARIFICATION" || value === "N/A") {
    return "";
  }
  return value;
}

/**
 * Parse plan data
 */
function parsePlanData(planFile: string): {
  lang: string | undefined;
  framework: string | undefined;
  db: string | undefined;
  projectType: string | undefined;
} {
  if (!existsSync(planFile)) {
    console.error(`ERROR: Plan file not found: ${planFile}`);
    process.exit(ExitCode.USER_ERROR);
  }

  const content = readFileSync(planFile, "utf-8");

  const lang = extractPlanField("Language/Version", content);
  const framework = extractPlanField("Primary Dependencies", content);
  const db = extractPlanField("Storage", content);
  const projectType = extractPlanField("Project Type", content);

  // Log what we found
  if (lang) {
    console.log(`INFO: Found language: ${lang}`);
  } else {
    console.error("WARNING: No language information found in plan");
  }

  if (framework) {
    console.log(`INFO: Found framework: ${framework}`);
  }

  if (db && db !== "N/A") {
    console.log(`INFO: Found database: ${db}`);
  }

  if (projectType) {
    console.log(`INFO: Found project type: ${projectType}`);
  }

  return { lang, framework, db, projectType };
}

/**
 * Format technology stack
 */
function formatTechnologyStack(lang: string | undefined, framework: string | undefined): string {
  const parts: string[] = [];

  if (lang && lang !== "NEEDS CLARIFICATION") {
    parts.push(lang);
  }

  if (framework && framework !== "NEEDS CLARIFICATION" && framework !== "N/A") {
    parts.push(framework);
  }

  return parts.join(" + ");
}

/**
 * Get project structure based on project type
 */
function getProjectStructure(projectType: string | undefined): string {
  if (projectType?.toLowerCase().includes("web")) {
    return "backend/\nfrontend/\ntests/";
  }
  return "src/\ntests/";
}

/**
 * Get commands for language
 */
function getCommandsForLanguage(lang: string | undefined): string {
  if (lang?.includes("Python")) {
    return "cd src && pytest && ruff check .";
  } else if (lang?.includes("Rust")) {
    return "cargo test && cargo clippy";
  } else if (lang?.includes("JavaScript") || lang?.includes("TypeScript")) {
    return "npm test && npm run lint";
  }
  return `# Add commands for ${lang ?? 'Unknown'}`;
}

/**
 * Get language conventions
 */
function getLanguageConventions(lang: string | undefined): string {
  return `${lang ?? 'Unknown'}: Follow standard conventions`;
}

/**
 * Create new CLAUDE.md from template
 */
function createNewClaudeFile(
  targetFile: string,
  templateFile: string,
  projectName: string,
  currentDate: string,
  currentBranch: string,
  lang: string | undefined,
  framework: string | undefined,
  projectType: string | undefined
): void {
  if (!existsSync(templateFile)) {
    console.error(`ERROR: Template not found at ${templateFile}`);
    process.exit(ExitCode.USER_ERROR);
  }

  console.log("INFO: Creating new CLAUDE.md from template...");

  let content = readFileSync(templateFile, "utf-8");

  // Build technology stack and recent change strings
  let techStack = "";
  let recentChange = "";

  if (lang && framework) {
    techStack = `- ${lang} + ${framework} (${currentBranch})`;
    recentChange = `- ${currentBranch}: Added ${lang} + ${framework}`;
  } else if (lang) {
    techStack = `- ${lang} (${currentBranch})`;
    recentChange = `- ${currentBranch}: Added ${lang}`;
  } else if (framework) {
    techStack = `- ${framework} (${currentBranch})`;
    recentChange = `- ${currentBranch}: Added ${framework}`;
  } else {
    techStack = `- (${currentBranch})`;
    recentChange = `- ${currentBranch}: Added`;
  }

  const projectStructure = getProjectStructure(projectType);
  const commands = getCommandsForLanguage(lang);
  const languageConventions = getLanguageConventions(lang);

  // Perform substitutions
  content = content.replace(/\[PROJECT NAME\]/g, projectName);
  content = content.replace(/\[DATE\]/g, currentDate);
  content = content.replace(/\[EXTRACTED FROM ALL PLAN\.MD FILES\]/g, techStack);
  content = content.replace(/\[ACTUAL STRUCTURE FROM PLANS\]/g, projectStructure);
  content = content.replace(/\[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES\]/g, commands);
  content = content.replace(/\[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE\]/g, languageConventions);
  content = content.replace(/\[LAST 3 FEATURES AND WHAT THEY ADDED\]/g, recentChange);

  writeFileSync(targetFile, content, "utf-8");
  console.log(`✓ Created CLAUDE.md`);
}

/**
 * Update existing CLAUDE.md
 */
function updateExistingClaudeFile(
  targetFile: string,
  currentDate: string,
  currentBranch: string,
  lang: string | undefined,
  framework: string | undefined,
  db: string | undefined
): void {
  console.log("INFO: Updating existing CLAUDE.md...");

  const content = readFileSync(targetFile, "utf-8");
  const lines = content.split("\n");
  const output: string[] = [];

  const techStack = formatTechnologyStack(lang, framework);
  const newTechEntries: string[] = [];
  let newChangeEntry = "";

  // Prepare new technology entries
  if (techStack && !content.includes(techStack)) {
    newTechEntries.push(`- ${techStack} (${currentBranch})`);
  }

  if (db && db !== "N/A" && db !== "NEEDS CLARIFICATION" && !content.includes(db)) {
    newTechEntries.push(`- ${db} (${currentBranch})`);
  }

  // Prepare new change entry
  if (techStack) {
    newChangeEntry = `- ${currentBranch}: Added ${techStack}`;
  } else if (db && db !== "N/A" && db !== "NEEDS CLARIFICATION") {
    newChangeEntry = `- ${currentBranch}: Added ${db}`;
  }

  // Process file line by line
  let inTechSection = false;
  let inChangesSection = false;
  let techEntriesAdded = false;
  let existingChangesCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // Handle Active Technologies section
    if (line === "## Active Technologies") {
      output.push(line);
      inTechSection = true;
      continue;
    } else if (inTechSection && line.match(/^##\s/)) {
      // Add new tech entries before closing the section
      if (!techEntriesAdded && newTechEntries.length > 0) {
        output.push(...newTechEntries);
        techEntriesAdded = true;
      }
      output.push(line);
      inTechSection = false;
      continue;
    } else if (inTechSection && line === "") {
      // Add new tech entries before empty line in tech section
      if (!techEntriesAdded && newTechEntries.length > 0) {
        output.push(...newTechEntries);
        techEntriesAdded = true;
      }
      output.push(line);
      continue;
    }

    // Handle Recent Changes section
    if (line === "## Recent Changes") {
      output.push(line);
      // Add new change entry right after the heading
      if (newChangeEntry) {
        output.push(newChangeEntry);
      }
      inChangesSection = true;
      continue;
    } else if (inChangesSection && line.match(/^##\s/)) {
      output.push(line);
      inChangesSection = false;
      continue;
    } else if (inChangesSection && line.startsWith("- ")) {
      // Keep only first 2 existing changes
      if (existingChangesCount < 2) {
        output.push(line);
        existingChangesCount++;
      }
      continue;
    }

    // Update timestamp
    if (line.match(/\*\*Last updated\*\*:.*\d{4}-\d{2}-\d{2}/)) {
      output.push(line.replace(/\d{4}-\d{2}-\d{2}/, currentDate));
    } else {
      output.push(line);
    }
  }

  writeFileSync(targetFile, output.join("\n"), "utf-8");
  console.log(`✓ Updated CLAUDE.md`);
}

/**
 * Update CLAUDE.md file
 */
function updateClaudeFile(
  repoRoot: string,
  currentBranch: string,
  lang: string | undefined,
  framework: string | undefined,
  db: string | undefined,
  projectType: string | undefined
): void {
  const targetFile = path.join(repoRoot, "CLAUDE.md");
  console.log(`INFO: Updating CLAUDE.md: ${targetFile}`);

  const projectName = path.basename(repoRoot);
  const currentDate = new Date().toISOString().split("T")[0]!;

  const templateFile = path.join(getTemplatesDir(), "agent-file-template.md");

  if (!existsSync(targetFile)) {
    // Create new file from template
    createNewClaudeFile(targetFile, templateFile, projectName, currentDate, currentBranch, lang, framework, projectType);
  } else {
    // Update existing file
    updateExistingClaudeFile(targetFile, currentDate, currentBranch, lang, framework, db);
  }
}

/**
 * Print summary
 */
function printSummary(lang: string | undefined, framework: string | undefined, db: string | undefined): void {
  console.log("");
  console.log("INFO: Summary of changes:");

  if (lang) {
    console.log(`  - Added language: ${lang}`);
  }

  if (framework) {
    console.log(`  - Added framework: ${framework}`);
  }

  if (db && db !== "N/A") {
    console.log(`  - Added database: ${db}`);
  }
}

/**
 * Main function
 */
export async function main(_args: string[]): Promise<number> {
  // Get feature paths
  const paths = await getFeaturePaths();

  // Validate environment
  if (!paths.CURRENT_BRANCH) {
    console.error("ERROR: Unable to determine current feature");
    if (paths.HAS_GIT === "true") {
      console.log("INFO: Make sure you're on a feature branch");
    } else {
      console.log("INFO: Set SPECIFY_FEATURE environment variable or create a feature first");
    }
    return ExitCode.USER_ERROR;
  }

  if (!existsSync(paths.IMPL_PLAN)) {
    console.error(`ERROR: No plan.md found at ${paths.IMPL_PLAN}`);
    console.log("INFO: Make sure you're working on a feature with a corresponding spec directory");
    if (paths.HAS_GIT !== "true") {
      console.log("INFO: Use: export SPECIFY_FEATURE=your-feature-name or create a new feature first");
    }
    return ExitCode.USER_ERROR;
  }

  console.log(`INFO: === Updating CLAUDE.md for feature ${paths.CURRENT_BRANCH} ===`);

  // Parse plan data
  const planData = parsePlanData(paths.IMPL_PLAN);

  // Update CLAUDE.md
  updateClaudeFile(
    paths.REPO_ROOT,
    paths.CURRENT_BRANCH,
    planData.lang,
    planData.framework,
    planData.db,
    planData.projectType
  );

  // Print summary
  printSummary(planData.lang, planData.framework, planData.db);

  console.log("");
  console.log("✓ CLAUDE.md update completed successfully");
  return ExitCode.SUCCESS;
}

/**
 * Entry point
 */
if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
