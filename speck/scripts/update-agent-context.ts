#!/usr/bin/env bun

/**
 * Update Agent Context Script
 *
 * Bun TypeScript implementation of update-agent-context.sh
 *
 * Transformation Date: 2025-11-15
 * Source: upstream/v0.0.85/.specify/scripts/bash/update-agent-context.sh
 * Strategy: Pure TypeScript (file I/O, string parsing, regex)
 *
 * Changes from v0.0.84 to v0.0.85:
 * - Upstream added CDPATH="" to cd command for SCRIPT_DIR (security fix)
 * - TypeScript implementation already immune: uses import.meta.dir instead of cd
 * - No code changes needed, only documentation updated to track v0.0.85
 *
 * CLI Interface:
 * - Arguments: [agent_type] (optional)
 * - Agent types: claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|shai|q
 * - Exit Codes: 0 (success), 1 (user error)
 *
 * Transformation Rationale:
 * - Replaced bash file parsing with native TypeScript string operations
 * - Replaced sed operations with TypeScript string replacement
 * - Replaced bash functions with TypeScript functions
 * - Preserved all logic including multi-agent support
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getFeaturePaths, getTemplatesDir } from "./common/paths";
import { ExitCode } from "./contracts/cli-interface";

/**
 * Agent file paths configuration
 */
interface AgentFilePaths {
  claude: string;
  gemini: string;
  copilot: string;
  "cursor-agent": string;
  qwen: string;
  opencode: string;
  codex: string;
  windsurf: string;
  kilocode: string;
  auggie: string;
  roo: string;
  codebuddy: string;
  amp: string;
  shai: string;
  q: string;
}

/**
 * Get agent file paths
 */
function getAgentFilePaths(repoRoot: string): AgentFilePaths {
  return {
    claude: path.join(repoRoot, "CLAUDE.md"),
    gemini: path.join(repoRoot, "GEMINI.md"),
    copilot: path.join(repoRoot, ".github/agents/copilot-instructions.md"),
    "cursor-agent": path.join(repoRoot, ".cursor/rules/specify-rules.mdc"),
    qwen: path.join(repoRoot, "QWEN.md"),
    opencode: path.join(repoRoot, "AGENTS.md"),
    codex: path.join(repoRoot, "AGENTS.md"),
    windsurf: path.join(repoRoot, ".windsurf/rules/specify-rules.md"),
    kilocode: path.join(repoRoot, ".kilocode/rules/specify-rules.md"),
    auggie: path.join(repoRoot, ".augment/rules/specify-rules.md"),
    roo: path.join(repoRoot, ".roo/rules/specify-rules.md"),
    codebuddy: path.join(repoRoot, "CODEBUDDY.md"),
    amp: path.join(repoRoot, "AGENTS.md"),
    shai: path.join(repoRoot, "SHAI.md"),
    q: path.join(repoRoot, "AGENTS.md"),
  };
}

/**
 * Extract plan field by pattern
 */
function extractPlanField(fieldPattern: string, planContent: string): string {
  const regex = new RegExp(`^\\*\\*${fieldPattern}\\*\\*: (.+)$`, "m");
  const match = planContent.match(regex);
  if (!match) return "";

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
  lang: string;
  framework: string;
  db: string;
  projectType: string;
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
function formatTechnologyStack(lang: string, framework: string): string {
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
function getProjectStructure(projectType: string): string {
  if (projectType.toLowerCase().includes("web")) {
    return "backend/\nfrontend/\ntests/";
  }
  return "src/\ntests/";
}

/**
 * Get commands for language
 */
function getCommandsForLanguage(lang: string): string {
  if (lang.includes("Python")) {
    return "cd src && pytest && ruff check .";
  } else if (lang.includes("Rust")) {
    return "cargo test && cargo clippy";
  } else if (lang.includes("JavaScript") || lang.includes("TypeScript")) {
    return "npm test && npm run lint";
  }
  return `# Add commands for ${lang}`;
}

/**
 * Get language conventions
 */
function getLanguageConventions(lang: string): string {
  return `${lang}: Follow standard conventions`;
}

/**
 * Create new agent file from template
 */
function createNewAgentFile(
  targetFile: string,
  templateFile: string,
  projectName: string,
  currentDate: string,
  currentBranch: string,
  lang: string,
  framework: string,
  projectType: string
): void {
  if (!existsSync(templateFile)) {
    console.error(`ERROR: Template not found at ${templateFile}`);
    process.exit(ExitCode.USER_ERROR);
  }

  console.log("INFO: Creating new agent context file from template...");

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
  console.log(`✓ Created new agent context file`);
}

/**
 * Update existing agent file
 */
function updateExistingAgentFile(
  targetFile: string,
  currentDate: string,
  currentBranch: string,
  lang: string,
  framework: string,
  db: string
): void {
  console.log("INFO: Updating existing agent context file...");

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
  let changesEntriesAdded = false;
  let existingChangesCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

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
      changesEntriesAdded = true;
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
  console.log(`✓ Updated existing agent context file`);
}

/**
 * Update agent file
 */
function updateAgentFile(
  targetFile: string,
  agentName: string,
  repoRoot: string,
  currentBranch: string,
  lang: string,
  framework: string,
  db: string,
  projectType: string
): void {
  console.log(`INFO: Updating ${agentName} context file: ${targetFile}`);

  const projectName = path.basename(repoRoot);
  const currentDate = new Date().toISOString().split("T")[0];

  // Create directory if it doesn't exist
  const targetDir = path.dirname(targetFile);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const templateFile = path.join(getTemplatesDir(), "agent-file-template.md");

  if (!existsSync(targetFile)) {
    // Create new file from template
    createNewAgentFile(targetFile, templateFile, projectName, currentDate, currentBranch, lang, framework, projectType);
  } else {
    // Update existing file
    updateExistingAgentFile(targetFile, currentDate, currentBranch, lang, framework, db);
  }
}

/**
 * Update specific agent
 */
function updateSpecificAgent(
  agentType: string,
  agentPaths: AgentFilePaths,
  repoRoot: string,
  currentBranch: string,
  lang: string,
  framework: string,
  db: string,
  projectType: string
): void {
  const agentNames: Record<string, string> = {
    claude: "Claude Code",
    gemini: "Gemini CLI",
    copilot: "GitHub Copilot",
    "cursor-agent": "Cursor IDE",
    qwen: "Qwen Code",
    opencode: "opencode",
    codex: "Codex CLI",
    windsurf: "Windsurf",
    kilocode: "Kilo Code",
    auggie: "Auggie CLI",
    roo: "Roo Code",
    codebuddy: "CodeBuddy CLI",
    amp: "Amp",
    shai: "SHAI",
    q: "Amazon Q Developer CLI",
  };

  if (!(agentType in agentPaths)) {
    console.error(`ERROR: Unknown agent type '${agentType}'`);
    console.error("Expected: claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|roo|amp|shai|q");
    process.exit(ExitCode.USER_ERROR);
  }

  const targetFile = agentPaths[agentType as keyof AgentFilePaths];
  const agentName = agentNames[agentType];
  updateAgentFile(targetFile, agentName, repoRoot, currentBranch, lang, framework, db, projectType);
}

/**
 * Update all existing agents
 */
function updateAllExistingAgents(
  agentPaths: AgentFilePaths,
  repoRoot: string,
  currentBranch: string,
  lang: string,
  framework: string,
  db: string,
  projectType: string
): void {
  let foundAgent = false;

  const agentConfigs = [
    { key: "claude", name: "Claude Code" },
    { key: "gemini", name: "Gemini CLI" },
    { key: "copilot", name: "GitHub Copilot" },
    { key: "cursor-agent", name: "Cursor IDE" },
    { key: "qwen", name: "Qwen Code" },
    { key: "opencode", name: "Codex/opencode" },
    { key: "windsurf", name: "Windsurf" },
    { key: "kilocode", name: "Kilo Code" },
    { key: "auggie", name: "Auggie CLI" },
    { key: "roo", name: "Roo Code" },
    { key: "codebuddy", name: "CodeBuddy CLI" },
    { key: "shai", name: "SHAI" },
    { key: "q", name: "Amazon Q Developer CLI" },
  ];

  for (const { key, name } of agentConfigs) {
    const targetFile = agentPaths[key as keyof AgentFilePaths];
    if (existsSync(targetFile)) {
      updateAgentFile(targetFile, name, repoRoot, currentBranch, lang, framework, db, projectType);
      foundAgent = true;
    }
  }

  // If no agent files exist, create a default Claude file
  if (!foundAgent) {
    console.log("INFO: No existing agent files found, creating default Claude file...");
    updateAgentFile(agentPaths.claude, "Claude Code", repoRoot, currentBranch, lang, framework, db, projectType);
  }
}

/**
 * Print summary
 */
function printSummary(lang: string, framework: string, db: string): void {
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

  console.log("");
  console.log("INFO: Usage: update-agent-context [claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|codebuddy|shai|q]");
}

/**
 * Main function
 */
async function main(args: string[]): Promise<number> {
  const agentType = args[0] || "";

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

  console.log(`INFO: === Updating agent context files for feature ${paths.CURRENT_BRANCH} ===`);

  // Parse plan data
  const planData = parsePlanData(paths.IMPL_PLAN);

  // Get agent file paths
  const agentPaths = getAgentFilePaths(paths.REPO_ROOT);

  // Process based on agent type argument
  if (!agentType) {
    // No specific agent provided - update all existing agent files
    console.log("INFO: No agent specified, updating all existing agent files...");
    updateAllExistingAgents(
      agentPaths,
      paths.REPO_ROOT,
      paths.CURRENT_BRANCH,
      planData.lang,
      planData.framework,
      planData.db,
      planData.projectType
    );
  } else {
    // Specific agent provided - update only that agent
    console.log(`INFO: Updating specific agent: ${agentType}`);
    updateSpecificAgent(
      agentType,
      agentPaths,
      paths.REPO_ROOT,
      paths.CURRENT_BRANCH,
      planData.lang,
      planData.framework,
      planData.db,
      planData.projectType
    );
  }

  // Print summary
  printSummary(planData.lang, planData.framework, planData.db);

  console.log("✓ Agent context update completed successfully");
  return ExitCode.SUCCESS;
}

/**
 * Entry point
 */
if (import.meta.main) {
  const exitCode = await main(process.argv.slice(2));
  process.exit(exitCode);
}
