#!/usr/bin/env bun
// @bun
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// plugins/speck-reviewer/cli/src/logger.ts
function getLogLevel() {
  const envLevel = process.env.SPECK_LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }
  if (process.env.SPECK_DEBUG === "1") {
    return "debug";
  }
  return "info";
}
function shouldLog(level) {
  const currentLevel = getLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}
function formatTimestamp() {
  return new Date().toISOString();
}
function formatMessage(level, message, ...args) {
  const timestamp = process.env.SPECK_DEBUG === "1" ? `[${formatTimestamp()}] ` : "";
  const prefix = level === "debug" ? "[DEBUG] " : "";
  const formattedArgs = args.length > 0 ? " " + args.map(String).join(" ") : "";
  return `${timestamp}${prefix}${message}${formattedArgs}`;
}
var LOG_LEVELS, logger;
var init_logger = __esm(() => {
  LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  logger = {
    debug(message, ...args) {
      if (shouldLog("debug")) {
        console.error(formatMessage("debug", message, ...args));
      }
    },
    info(message, ...args) {
      if (shouldLog("info")) {
        console.log(formatMessage("info", message, ...args));
      }
    },
    warn(message, ...args) {
      if (shouldLog("warn")) {
        console.error(formatMessage("warn", `Warning: ${message}`, ...args));
      }
    },
    error(message, ...args) {
      if (shouldLog("error")) {
        console.error(formatMessage("error", `Error: ${message}`, ...args));
      }
    },
    json(data) {
      console.log(JSON.stringify(data, null, 2));
    },
    getLevel() {
      return getLogLevel();
    }
  };
});

// plugins/speck-reviewer/cli/src/github.ts
var {$ } = globalThis.Bun;
async function checkGhAuth() {
  try {
    const result = await $`gh auth status`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
async function getCurrentUser() {
  try {
    const result = await $`gh api user --jq .login`.text();
    return result.trim();
  } catch (error) {
    logger.error("Failed to get current user:", error);
    return null;
  }
}
async function getPRInfo(prNumber) {
  try {
    const prArg = prNumber ? String(prNumber) : "";
    const jsonFields = "number,title,author,headRefName,baseRefName,url";
    const cmd = prArg ? $`gh pr view ${prArg} --json ${jsonFields}` : $`gh pr view --json ${jsonFields}`;
    const result = await cmd.json();
    const repoFullName = await getRepoFullName();
    return {
      number: result.number,
      title: result.title,
      author: result.author?.login || "unknown",
      headBranch: result.headRefName,
      baseBranch: result.baseRefName,
      repoFullName: repoFullName || "unknown/unknown",
      url: result.url
    };
  } catch (error) {
    logger.error("Failed to get PR info:", error);
    return null;
  }
}
async function getRepoFullName() {
  try {
    const result = await $`gh repo view --json nameWithOwner --jq .nameWithOwner`.text();
    return result.trim();
  } catch (error) {
    logger.debug("Failed to get repo name:", error);
    return null;
  }
}
async function getPRFiles(prNumber) {
  try {
    const prArg = prNumber ? String(prNumber) : "";
    const cmd = prArg ? $`gh pr view ${prArg} --json files` : $`gh pr view --json files`;
    const result = await cmd.json();
    return (result.files || []).map((file) => ({
      path: file.path,
      changeType: mapChangeType(file.status || "modified"),
      additions: file.additions || 0,
      deletions: file.deletions || 0
    }));
  } catch (error) {
    logger.error("Failed to get PR files:", error);
    return [];
  }
}
function mapChangeType(status) {
  switch (status.toLowerCase()) {
    case "added":
    case "a":
      return "added";
    case "removed":
    case "deleted":
    case "d":
      return "deleted";
    case "renamed":
    case "r":
      return "renamed";
    default:
      return "modified";
  }
}
async function getCurrentBranch() {
  try {
    const result = await $`git rev-parse --abbrev-ref HEAD`.text();
    return result.trim();
  } catch (error) {
    logger.debug("Failed to get current branch:", error);
    return null;
  }
}
async function postComment(prNumber, file, line, body) {
  try {
    const repoFullName = await getRepoFullName();
    if (!repoFullName) {
      logger.error("Failed to get repository name");
      return null;
    }
    const result = await $`gh api repos/${repoFullName}/pulls/${prNumber}/comments \
      -f body=${body} \
      -f path=${file} \
      -F line=${line} \
      -f side=RIGHT \
      --jq .id`.text();
    return parseInt(result.trim(), 10);
  } catch (error) {
    logger.error("Failed to post comment:", error);
    return null;
  }
}
async function replyToComment(prNumber, commentId, body) {
  try {
    const repoFullName = await getRepoFullName();
    if (!repoFullName) {
      logger.error("Failed to get repository name");
      return false;
    }
    await $`gh api repos/${repoFullName}/pulls/${prNumber}/comments/${commentId}/replies \
      -f body=${body}`.quiet();
    return true;
  } catch (error) {
    logger.error("Failed to reply to comment:", error);
    return false;
  }
}
async function deleteComment(commentId) {
  try {
    const repoFullName = await getRepoFullName();
    if (!repoFullName) {
      logger.error("Failed to get repository name");
      return false;
    }
    await $`gh api repos/${repoFullName}/pulls/comments/${commentId} -X DELETE`.quiet();
    return true;
  } catch (error) {
    logger.error("Failed to delete comment:", error);
    return false;
  }
}
async function listComments(prNumber) {
  try {
    const prArg = prNumber ? String(prNumber) : "";
    const cmd = prArg ? $`gh pr view ${prArg} --json reviewComments` : $`gh pr view --json reviewComments`;
    const result = await cmd.json();
    return (result.reviewComments || []).map((comment) => ({
      id: comment.id,
      path: comment.path,
      line: comment.line || 0,
      body: comment.body,
      author: comment.author?.login || "unknown",
      state: comment.state === "resolved" ? "resolved" : "open",
      createdAt: comment.createdAt
    }));
  } catch (error) {
    logger.error("Failed to list comments:", error);
    return [];
  }
}
async function submitReview(prNumber, event, body) {
  try {
    const eventFlag = event === "APPROVE" ? "--approve" : event === "REQUEST_CHANGES" ? "--request-changes" : "--comment";
    const cmd = body ? $`gh pr review ${prNumber} ${eventFlag} --body ${body}` : $`gh pr review ${prNumber} ${eventFlag}`;
    await cmd.quiet();
    return true;
  } catch (error) {
    logger.error("Failed to submit review:", error);
    return false;
  }
}
async function postIssueComment(prNumber, body) {
  try {
    await $`gh pr comment ${prNumber} --body ${body}`.quiet();
    return true;
  } catch (error) {
    logger.error("Failed to post issue comment:", error);
    return false;
  }
}
var init_github = __esm(() => {
  init_logger();
});

// plugins/speck-reviewer/cli/src/clustering.ts
function clusterFiles(files) {
  logger.debug(`Clustering ${files.length} files`);
  const dirGroups = groupByDirectory(files);
  let clusters = Object.entries(dirGroups).map(([dir, groupFiles], index) => {
    const priority = getDirectoryPriority(dir);
    return createCluster(dir, groupFiles, index + 1, priority);
  });
  clusters = clusters.flatMap((cluster) => {
    if (cluster.files.length > MAX_CLUSTER_SIZE) {
      return subdivideCluster(cluster);
    }
    return [cluster];
  });
  clusters.sort((a, b) => a.priority - b.priority);
  clusters.forEach((cluster, index) => {
    cluster.id = `cluster-${index + 1}`;
    cluster.priority = index + 1;
  });
  logger.debug(`Created ${clusters.length} clusters`);
  return clusters;
}
function groupByDirectory(files) {
  const groups = {};
  for (const file of files) {
    const dir = getParentDirectory(file.path);
    if (!groups[dir]) {
      groups[dir] = [];
    }
    groups[dir].push(file);
  }
  return groups;
}
function getParentDirectory(path) {
  const parts = path.split("/");
  if (parts.length <= 1) {
    return "root";
  }
  const parent = parts.slice(0, -1).join("/");
  return parent || "root";
}
function getDirectoryPriority(dir) {
  const lowerDir = dir.toLowerCase();
  for (const [pattern, priority] of Object.entries(DIRECTORY_PRIORITIES)) {
    if (lowerDir.includes(pattern)) {
      return priority;
    }
  }
  return 5;
}
function createCluster(dir, files, index, priority) {
  const clusterFiles2 = files.map((f) => ({
    path: f.path,
    changeType: f.changeType,
    additions: f.additions,
    deletions: f.deletions,
    reviewNotes: getReviewNotes(f)
  }));
  return {
    id: `cluster-${index}`,
    name: generateClusterName(dir),
    description: getClusterDescription(files),
    files: clusterFiles2,
    priority,
    dependsOn: [],
    status: "pending"
  };
}
function subdivideCluster(cluster) {
  const subGroups = {};
  for (const file of cluster.files) {
    const parts = file.path.split("/");
    const subDir = parts.length > 2 ? parts.slice(0, 3).join("/") : parts.slice(0, 2).join("/");
    if (!subGroups[subDir]) {
      subGroups[subDir] = [];
    }
    subGroups[subDir].push(file);
  }
  return Object.entries(subGroups).map(([subDir, files], index) => ({
    id: `${cluster.id}-${index + 1}`,
    name: generateClusterName(subDir),
    description: getClusterDescription(files.map((f) => ({
      path: f.path,
      changeType: f.changeType,
      additions: f.additions,
      deletions: f.deletions
    }))),
    files,
    priority: cluster.priority,
    dependsOn: [],
    status: "pending"
  }));
}
function generateClusterName(dir) {
  if (dir === "root") {
    return "Root Files";
  }
  const parts = dir.split("/").filter((p) => p && p !== "src" && p !== "lib");
  const lastPart = parts[parts.length - 1] || dir;
  const titleCase = lastPart.split(/[-_]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  return titleCase;
}
function getClusterDescription(files) {
  const fileCount = files.length;
  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);
  const changeTypes = new Set(files.map((f) => f.changeType));
  const changeList = Array.from(changeTypes).join(", ");
  let description = `${fileCount} file${fileCount !== 1 ? "s" : ""} (${changeList})`;
  if (additions > 0 || deletions > 0) {
    description += ` - +${additions}/-${deletions} lines`;
  }
  return description;
}
function getReviewNotes(file) {
  const notes = [];
  if (file.path.includes("test") || file.path.includes("spec")) {
    notes.push("[Has tests]");
  }
  if (file.changeType === "added") {
    notes.push("[New file]");
  }
  if (file.additions + file.deletions > 100) {
    notes.push("[Large change]");
  }
  return notes.length > 0 ? notes.join(" ") : undefined;
}
function detectCrossCuttingConcerns(files) {
  const concerns = [];
  for (const [concern, patterns] of Object.entries(CROSS_CUTTING_PATTERNS)) {
    const hasMatch = files.some((file) => patterns.some((pattern) => pattern.test(file.path)));
    if (hasMatch) {
      concerns.push(concern);
    }
  }
  return concerns;
}
var DIRECTORY_PRIORITIES, CROSS_CUTTING_PATTERNS, MAX_CLUSTER_SIZE = 50;
var init_clustering = __esm(() => {
  init_logger();
  DIRECTORY_PRIORITIES = {
    types: 1,
    models: 1,
    entities: 1,
    schemas: 1,
    interfaces: 2,
    utils: 2,
    helpers: 2,
    lib: 2,
    core: 3,
    services: 4,
    controllers: 5,
    routes: 5,
    api: 5,
    handlers: 5,
    components: 6,
    views: 6,
    pages: 6,
    tests: 7,
    test: 7,
    __tests__: 7,
    spec: 7,
    docs: 8,
    config: 9
  };
  CROSS_CUTTING_PATTERNS = {
    "Configuration changes": [/package\.json$/, /\.env/, /config\.(ts|js|json)$/, /tsconfig\.json$/],
    "New dependencies": [/package\.json$/, /package-lock\.json$/, /yarn\.lock$/, /bun\.lockb$/],
    "Database migrations": [/migrations?\//i, /\.sql$/],
    "CI/CD changes": [/\.github\//, /\.gitlab-ci/, /Dockerfile/, /docker-compose/],
    Documentation: [/README/, /CHANGELOG/, /docs\//]
  };
});

// plugins/speck-reviewer/cli/src/state.ts
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, renameSync } from "fs";
import { join, dirname } from "path";
function createSession(params) {
  const now = new Date().toISOString();
  return {
    $schema: STATE_SCHEMA_VERSION,
    prNumber: params.prNumber,
    repoFullName: params.repoFullName,
    branchName: params.branchName,
    baseBranch: params.baseBranch,
    title: params.title,
    author: params.author,
    reviewMode: params.reviewMode || "normal",
    narrative: "",
    clusters: [],
    comments: [],
    currentClusterId: undefined,
    reviewedSections: [],
    questions: [],
    startedAt: now,
    lastUpdated: now
  };
}
function getStatePath(repoRoot) {
  return join(repoRoot, STATE_FILE_NAME);
}
async function saveState(session, repoRoot) {
  const statePath = getStatePath(repoRoot);
  const stateDir = dirname(statePath);
  const tempPath = statePath + ".tmp";
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }
  session.lastUpdated = new Date().toISOString();
  const content = JSON.stringify(session, null, 2);
  writeFileSync(tempPath, content, "utf-8");
  renameSync(tempPath, statePath);
  logger.debug(`State saved to ${statePath}`);
}
async function loadState(repoRoot) {
  const statePath = getStatePath(repoRoot);
  if (!existsSync(statePath)) {
    logger.debug(`No state file found at ${statePath}`);
    return null;
  }
  try {
    const content = readFileSync(statePath, "utf-8");
    const state = JSON.parse(content);
    if (state.$schema !== STATE_SCHEMA_VERSION) {
      logger.warn(`State file has incompatible schema version: ${state.$schema}`);
      return null;
    }
    logger.debug(`State loaded from ${statePath}`);
    return state;
  } catch (error) {
    logger.error(`Failed to load state: ${error}`);
    return null;
  }
}
async function clearState(repoRoot) {
  const statePath = getStatePath(repoRoot);
  if (existsSync(statePath)) {
    unlinkSync(statePath);
    logger.debug(`State cleared: ${statePath}`);
  }
}
function getProgressSummary(session) {
  const total = session.clusters.length;
  const reviewed = session.clusters.filter((c) => c.status === "reviewed").length;
  const inProgress = session.clusters.filter((c) => c.status === "in_progress").length;
  const pending = session.clusters.filter((c) => c.status === "pending").length;
  return { total, reviewed, pending, inProgress };
}
function formatStateDisplay(session) {
  const progress = getProgressSummary(session);
  const stagedComments = session.comments.filter((c) => c.state === "staged").length;
  const postedComments = session.comments.filter((c) => c.state === "posted").length;
  const skippedComments = session.comments.filter((c) => c.state === "skipped").length;
  let output = `## Active Review Session

`;
  output += `- **PR**: #${session.prNumber} - ${session.title}
`;
  output += `- **Author**: @${session.author}
`;
  output += `- **Branch**: ${session.branchName}
`;
  output += `- **Mode**: ${session.reviewMode}
`;
  output += `- **Started**: ${session.startedAt}
`;
  output += `- **Last Updated**: ${session.lastUpdated}

`;
  output += `### Progress: ${progress.reviewed}/${progress.total} clusters reviewed

`;
  for (const cluster of session.clusters) {
    const icon = cluster.status === "reviewed" ? "\u2713" : cluster.status === "in_progress" ? "\u2192" : "\u25CB";
    output += `- ${icon} **${cluster.name}** (${cluster.files.length} files)
`;
  }
  output += `
### Comments: ${stagedComments} staged, ${postedComments} posted, ${skippedComments} skipped
`;
  return output;
}
var STATE_SCHEMA_VERSION = "review-state-v1", STATE_FILE_NAME = ".speck/review-state.json";
var init_state = __esm(() => {
  init_logger();
});

// plugins/speck-reviewer/cli/src/speck.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
import { join as join2 } from "path";
async function findSpecForBranch(branchName, repoRoot) {
  logger.debug("Finding spec for branch:", branchName);
  const directPath = join2(repoRoot, "specs", branchName, "spec.md");
  if (existsSync2(directPath)) {
    logger.debug("Found spec via direct path:", directPath);
    return { featureId: branchName, specPath: directPath };
  }
  const branchesPath = join2(repoRoot, ".speck", "branches.json");
  if (existsSync2(branchesPath)) {
    try {
      const content = readFileSync2(branchesPath, "utf-8");
      const branches = JSON.parse(content);
      const mapping = branches.branches?.[branchName];
      if (mapping?.specId) {
        const mappedPath = join2(repoRoot, "specs", mapping.specId, "spec.md");
        if (existsSync2(mappedPath)) {
          logger.debug("Found spec via branches.json:", mappedPath);
          return { featureId: mapping.specId, specPath: mappedPath };
        }
      }
    } catch (error) {
      logger.debug("Failed to parse branches.json:", error);
    }
  }
  const specsDir = join2(repoRoot, "specs");
  if (existsSync2(specsDir)) {
    const entries = Bun.spawnSync(["ls", specsDir]).stdout.toString().trim().split(`
`);
    for (const entry of entries) {
      if (branchName.includes(entry) || entry.includes(branchName.replace(/^feature\//, ""))) {
        const specPath = join2(specsDir, entry, "spec.md");
        if (existsSync2(specPath)) {
          logger.debug("Found spec via partial match:", specPath);
          return { featureId: entry, specPath };
        }
      }
    }
  }
  logger.debug("No spec found for branch:", branchName);
  return null;
}
function parseSpecContent(content) {
  const requirements = [];
  const userStories = [];
  const successCriteria = [];
  const reqPattern = /\*\*([A-Z]{2,3}-\d{3})\*\*:\s*(.+)/g;
  let match;
  while ((match = reqPattern.exec(content)) !== null) {
    const id = match[1];
    const text = match[2].trim();
    const category = id.startsWith("FR") ? "Functional" : id.startsWith("NFR") ? "Non-functional" : id.startsWith("SC") ? "Success Criteria" : "Other";
    if (id.startsWith("SC")) {
      successCriteria.push(`${id}: ${text}`);
    } else {
      requirements.push({ id, text, category });
    }
  }
  const storyPattern = /### User Story (\d+)\s*-\s*(.+?)\s*\(Priority:\s*(P[123])\)/g;
  let storyMatch;
  while ((storyMatch = storyPattern.exec(content)) !== null) {
    const id = parseInt(storyMatch[1], 10);
    const title = storyMatch[2].trim();
    const priority = storyMatch[3];
    const storyStart = storyMatch.index;
    const nextStoryMatch = content.slice(storyStart + 1).search(/### User Story \d+/);
    const storyEnd = nextStoryMatch === -1 ? content.length : storyStart + 1 + nextStoryMatch;
    const storyContent = content.slice(storyStart, storyEnd);
    const scenarios = [];
    const scenarioPattern = /\d+\.\s*\*\*Given\*\*[^.]+\*\*When\*\*[^.]+\*\*Then\*\*[^.]+\./g;
    let scenarioMatch;
    while ((scenarioMatch = scenarioPattern.exec(storyContent)) !== null) {
      scenarios.push(scenarioMatch[0].trim());
    }
    userStories.push({
      id,
      title,
      priority,
      acceptanceScenarios: scenarios
    });
  }
  return { requirements, userStories, successCriteria };
}
async function loadSpecContext(branchName, repoRoot) {
  const specInfo = await findSpecForBranch(branchName, repoRoot);
  if (!specInfo) {
    return null;
  }
  try {
    const content = readFileSync2(specInfo.specPath, "utf-8");
    const parsed = parseSpecContent(content);
    return {
      featureId: specInfo.featureId,
      specPath: specInfo.specPath,
      content,
      requirements: parsed.requirements,
      userStories: parsed.userStories,
      successCriteria: parsed.successCriteria
    };
  } catch (error) {
    logger.warn("Failed to load spec content:", error);
    return null;
  }
}
function formatSpecContextOutput(context) {
  if (!context) {
    return {
      found: false,
      reason: "No spec found for current branch"
    };
  }
  return {
    found: true,
    featureId: context.featureId,
    specPath: context.specPath,
    requirements: context.requirements,
    userStories: context.userStories.map((s) => ({
      id: s.id,
      title: s.title,
      priority: s.priority
    }))
  };
}
var init_speck = __esm(() => {
  init_logger();
});

// plugins/speck-reviewer/cli/src/commands/analyze.ts
var exports_analyze = {};
__export(exports_analyze, {
  analyzeCommand: () => analyzeCommand
});
async function analyzeCommand(args) {
  const prNumber = args[0] ? parseInt(args[0], 10) : undefined;
  if (prNumber !== undefined && isNaN(prNumber)) {
    throw new Error(`Invalid PR number: ${args[0]}`);
  }
  logger.debug("analyze command", { prNumber });
  const isAuthed = await checkGhAuth();
  if (!isAuthed) {
    throw new Error("GitHub CLI not authenticated. Run: gh auth login");
  }
  const prInfo = await getPRInfo(prNumber);
  if (!prInfo) {
    throw new Error(prNumber ? `Could not find PR #${prNumber}` : "Could not find PR for current branch. Specify a PR number: speck-review analyze <pr-number>");
  }
  logger.debug("PR info", prInfo);
  const files = await getPRFiles(prInfo.number);
  if (files.length === 0) {
    throw new Error("No files found in PR");
  }
  logger.debug(`Found ${files.length} changed files`);
  const clusters = clusterFiles(files);
  const crossCuttingConcerns = detectCrossCuttingConcerns(files);
  const repoRoot = process.cwd();
  const specContext = await loadSpecContext(prInfo.headBranch, repoRoot);
  if (specContext) {
    logger.debug("Loaded spec context for branch:", prInfo.headBranch);
  } else {
    logger.debug("No spec found for branch:", prInfo.headBranch, "(proceeding with standard review - FR-022)");
  }
  const narrative = generateNarrative(prInfo, files.length, clusters.length, crossCuttingConcerns, specContext);
  const currentUser = await getCurrentUser();
  const isSelfReview = currentUser === prInfo.author;
  let session = await loadState(repoRoot);
  if (session && session.prNumber === prInfo.number) {
    session.clusters = clusters;
    session.narrative = narrative;
    session.lastUpdated = new Date().toISOString();
    if (isSelfReview) {
      session.reviewMode = "self-review";
    }
  } else {
    session = createSession({
      prNumber: prInfo.number,
      repoFullName: prInfo.repoFullName,
      branchName: prInfo.headBranch,
      baseBranch: prInfo.baseBranch,
      title: prInfo.title,
      author: prInfo.author,
      reviewMode: isSelfReview ? "self-review" : "normal"
    });
    session.clusters = clusters;
    session.narrative = narrative;
  }
  await saveState(session, repoRoot);
  const output = {
    prNumber: prInfo.number,
    title: prInfo.title,
    author: prInfo.author,
    baseBranch: prInfo.baseBranch,
    headBranch: prInfo.headBranch,
    narrative,
    clusters,
    crossCuttingConcerns,
    totalFiles: files.length,
    specContext: specContext || undefined
  };
  logger.json(output);
}
function generateNarrative(prInfo, fileCount, clusterCount, concerns, specContext) {
  let narrative = `**${prInfo.title}** by @${prInfo.author}

`;
  narrative += `This PR contains ${fileCount} changed files organized into ${clusterCount} review clusters.
`;
  if (concerns.length > 0) {
    narrative += `
**Cross-cutting concerns**: ${concerns.join(", ")}
`;
  }
  if (specContext) {
    narrative += `
**Speck Specification**: \`${specContext.featureId}\`
`;
    if (specContext.requirements.length > 0) {
      narrative += `- ${specContext.requirements.length} requirements defined
`;
    }
    if (specContext.userStories.length > 0) {
      narrative += `- ${specContext.userStories.length} user stories
`;
    }
  }
  narrative += `
Branch: \`${prInfo.headBranch}\``;
  return narrative;
}
var init_analyze = __esm(() => {
  init_logger();
  init_github();
  init_clustering();
  init_state();
  init_speck();
});

// plugins/speck-reviewer/cli/src/commands/state.ts
var exports_state = {};
__export(exports_state, {
  stateCommand: () => stateCommand
});
async function stateCommand(args) {
  const subcommand = args[0] || "show";
  logger.debug("state command", { subcommand });
  switch (subcommand) {
    case "show":
      await showState();
      break;
    case "clear":
      await clearStateCmd();
      break;
    default:
      throw new Error(`Unknown state subcommand: ${subcommand}. Use 'show' or 'clear'.`);
  }
}
async function showState() {
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);
  if (!session) {
    console.log("No active review session found.");
    console.log("Start a review with: speck-review analyze <pr-number>");
    return;
  }
  const display = formatStateDisplay(session);
  console.log(display);
}
async function clearStateCmd() {
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);
  if (!session) {
    console.log("No review state to clear.");
    return;
  }
  await clearState(repoRoot);
  console.log(`\u2713 Cleared review state for PR #${session.prNumber}`);
}
var init_state2 = __esm(() => {
  init_logger();
  init_state();
});

// plugins/speck-reviewer/cli/src/commands/files.ts
var exports_files = {};
__export(exports_files, {
  filesCommand: () => filesCommand
});
async function filesCommand(_args) {
  logger.debug("files command");
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);
  if (session) {
    console.log(`## Changed Files
`);
    for (const cluster of session.clusters) {
      for (const file of cluster.files) {
        const stats = `+${file.additions}/-${file.deletions}`;
        const notes = file.reviewNotes ? ` ${file.reviewNotes}` : "";
        console.log(`- [${file.path}](${file.path}) (${stats}, ${file.changeType})${notes}`);
      }
    }
    console.log(`
**Total**: ${session.clusters.reduce((sum, c) => sum + c.files.length, 0)} files`);
    return;
  }
  const prInfo = await getPRInfo();
  if (!prInfo) {
    throw new Error("No PR found for current branch. Run 'speck-review analyze' first or specify a PR number.");
  }
  const files = await getPRFiles(prInfo.number);
  if (files.length === 0) {
    console.log("No changed files found in PR.");
    return;
  }
  console.log(`## Changed Files
`);
  for (const file of files) {
    const stats = `+${file.additions}/-${file.deletions}`;
    console.log(`- [${file.path}](${file.path}) (${stats}, ${file.changeType})`);
  }
  console.log(`
**Total**: ${files.length} files`);
}
var init_files = __esm(() => {
  init_logger();
  init_state();
  init_github();
});

// plugins/speck-reviewer/cli/src/commands/spec-context.ts
var exports_spec_context = {};
__export(exports_spec_context, {
  specContextCommand: () => specContextCommand
});
async function specContextCommand() {
  logger.debug("spec-context command");
  const branch = await getCurrentBranch();
  if (!branch) {
    logger.json({
      found: false,
      reason: "Could not determine current branch"
    });
    return;
  }
  logger.debug("Current branch:", branch);
  const repoRoot = process.cwd();
  const context = await loadSpecContext(branch, repoRoot);
  const output = formatSpecContextOutput(context);
  logger.json(output);
}
var init_spec_context = __esm(() => {
  init_logger();
  init_github();
  init_speck();
});

// plugins/speck-reviewer/cli/src/commands/comment.ts
var exports_comment = {};
__export(exports_comment, {
  listCommentsCommand: () => listCommentsCommand,
  commentReplyCommand: () => commentReplyCommand,
  commentDeleteCommand: () => commentDeleteCommand,
  commentCommand: () => commentCommand
});
async function commentCommand(args) {
  const [file, lineStr, ...bodyParts] = args;
  const body = bodyParts.join(" ");
  if (!file || !lineStr || !body) {
    throw new Error("Usage: speck-review comment <file> <line> <body>");
  }
  const line = parseInt(lineStr, 10);
  if (isNaN(line)) {
    throw new Error(`Invalid line number: ${lineStr}`);
  }
  logger.debug("comment command", { file, line, body });
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);
  if (!session) {
    throw new Error("No active review session. Run 'speck-review analyze' first.");
  }
  let commentId;
  if (session.reviewMode === "self-review") {
    const fullBody = `**${file}:${line}**

${body}`;
    const success = await postIssueComment(session.prNumber, fullBody);
    if (!success) {
      throw new Error("Failed to post issue comment. Comment preserved locally.");
    }
    console.log(`\u2713 Posted issue comment for ${file}:${line} (self-review mode)`);
    return;
  }
  commentId = await postComment(session.prNumber, file, line, body);
  if (commentId === null) {
    const stagedComment = {
      id: `staged-${Date.now()}`,
      file,
      line,
      body,
      originalBody: body,
      state: "staged",
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    session.comments.push(stagedComment);
    await saveState(session, repoRoot);
    throw new Error("Failed to post comment. Comment preserved locally - use 'list-comments' to see staged comments.");
  }
  const postedComment = {
    id: `posted-${commentId}`,
    file,
    line,
    body,
    originalBody: body,
    state: "posted",
    history: [{ timestamp: new Date().toISOString(), action: "post" }],
    githubId: commentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  session.comments.push(postedComment);
  await saveState(session, repoRoot);
  console.log(`\u2713 Added comment #${commentId} on ${file}:${line}`);
  console.log(`  [${file}:${line}](${file}#L${line})`);
}
async function commentReplyCommand(args) {
  const [commentIdStr, ...bodyParts] = args;
  const body = bodyParts.join(" ");
  if (!commentIdStr || !body) {
    throw new Error("Usage: speck-review comment-reply <comment-id> <body>");
  }
  const commentId = parseInt(commentIdStr, 10);
  if (isNaN(commentId)) {
    throw new Error(`Invalid comment ID: ${commentIdStr}`);
  }
  logger.debug("comment-reply command", { commentId, body });
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);
  if (!session) {
    throw new Error("No active review session. Run 'speck-review analyze' first.");
  }
  const success = await replyToComment(session.prNumber, commentId, body);
  if (!success) {
    throw new Error("Failed to reply to comment");
  }
  console.log(`\u2713 Replied to comment #${commentId}`);
}
async function commentDeleteCommand(args) {
  const [commentIdStr] = args;
  if (!commentIdStr) {
    throw new Error("Usage: speck-review comment-delete <comment-id>");
  }
  const commentId = parseInt(commentIdStr, 10);
  if (isNaN(commentId)) {
    throw new Error(`Invalid comment ID: ${commentIdStr}`);
  }
  logger.debug("comment-delete command", { commentId });
  const success = await deleteComment(commentId);
  if (!success) {
    throw new Error("Failed to delete comment");
  }
  console.log(`\u2713 Deleted comment #${commentId}`);
}
async function listCommentsCommand() {
  logger.debug("list-comments command");
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);
  const prNumber = session?.prNumber;
  const comments = await listComments(prNumber);
  const stagedComments = session?.comments.filter((c) => c.state === "staged") || [];
  const openComments = comments.filter((c) => c.state === "open");
  const resolvedComments = comments.filter((c) => c.state === "resolved");
  console.log(`## PR Comments (${comments.length} total: ${openComments.length} open, ${resolvedComments.length} resolved)`);
  if (stagedComments.length > 0) {
    console.log(`
### Staged (${stagedComments.length} local, not posted)
`);
    for (const comment of stagedComments) {
      console.log(`- **[staged]** [${comment.file}:${comment.line}](${comment.file}#L${comment.line})`);
      console.log(`  ${comment.body.substring(0, 80)}${comment.body.length > 80 ? "..." : ""}`);
    }
  }
  if (openComments.length > 0) {
    console.log(`
### Open
`);
    for (const comment of openComments) {
      console.log(`- **#${comment.id}** [${comment.path}:${comment.line}](${comment.path}#L${comment.line}) (@${comment.author})`);
      console.log(`  ${comment.body.substring(0, 80)}${comment.body.length > 80 ? "..." : ""}`);
    }
  }
  if (resolvedComments.length > 0) {
    console.log(`
### Resolved
`);
    for (const comment of resolvedComments) {
      console.log(`- ~~**#${comment.id}**~~ [${comment.path}:${comment.line}](${comment.path}#L${comment.line}) (@${comment.author})`);
      console.log(`  ${comment.body.substring(0, 80)}${comment.body.length > 80 ? "..." : ""}`);
    }
  }
  if (comments.length === 0 && stagedComments.length === 0) {
    console.log(`
No comments on this PR.`);
  }
}
var init_comment = __esm(() => {
  init_logger();
  init_state();
  init_github();
});

// plugins/speck-reviewer/cli/src/commands/review.ts
var exports_review = {};
__export(exports_review, {
  reviewCommand: () => reviewCommand
});
async function reviewCommand(args) {
  const [event, ...bodyParts] = args;
  const body = bodyParts.join(" ");
  if (!event) {
    throw new Error(`Usage: speck-review review <event> [body]
  Events: approve, request-changes, comment`);
  }
  const validEvents = ["approve", "request-changes", "comment"];
  if (!validEvents.includes(event)) {
    throw new Error(`Invalid review event: ${event}. Must be one of: ${validEvents.join(", ")}`);
  }
  if (event === "request-changes" && !body) {
    throw new Error("request-changes requires a body explaining the requested changes");
  }
  logger.debug("review command", { event, body });
  const repoRoot = process.cwd();
  const session = await loadState(repoRoot);
  if (!session) {
    throw new Error("No active review session. Run 'speck-review analyze' first.");
  }
  if (session.reviewMode === "self-review") {
    if (event === "approve" || event === "request-changes") {
      throw new Error(`Cannot ${event} in self-review mode. Use 'comment' instead.`);
    }
  }
  const stagedComments = session.comments.filter((c) => c.state === "staged");
  if (stagedComments.length > 0) {
    console.log(`Posting ${stagedComments.length} staged comment(s)...`);
    for (const comment of stagedComments) {
      if (session.reviewMode === "self-review") {
        const fullBody = `**${comment.file}:${comment.line}**

${comment.body}`;
        const success2 = await postIssueComment(session.prNumber, fullBody);
        if (success2) {
          comment.state = "posted";
          comment.history.push({ timestamp: new Date().toISOString(), action: "post" });
        }
      } else {
        const commentId = await postComment(session.prNumber, comment.file, comment.line, comment.body);
        if (commentId) {
          comment.state = "posted";
          comment.githubId = commentId;
          comment.history.push({ timestamp: new Date().toISOString(), action: "post" });
        }
      }
    }
    await saveState(session, repoRoot);
  }
  const ghEvent = event === "approve" ? "APPROVE" : event === "request-changes" ? "REQUEST_CHANGES" : "COMMENT";
  const success = await submitReview(session.prNumber, ghEvent, body || undefined);
  if (!success) {
    throw new Error("Failed to submit review");
  }
  console.log(`\u2713 Submitted review: ${event.toUpperCase()}`);
}
var init_review = __esm(() => {
  init_logger();
  init_state();
  init_github();
});

// plugins/speck-reviewer/cli/src/commands/check-self-review.ts
var exports_check_self_review = {};
__export(exports_check_self_review, {
  checkSelfReviewCommand: () => checkSelfReviewCommand
});
async function checkSelfReviewCommand(args) {
  const [author] = args;
  if (!author) {
    throw new Error("Usage: speck-review check-self-review <author>");
  }
  logger.debug("check-self-review command", { author });
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Could not determine current GitHub user. Ensure gh CLI is authenticated.");
  }
  const isSelfReview = currentUser.toLowerCase() === author.toLowerCase();
  const output = {
    isSelfReview,
    author
  };
  logger.json(output);
}
var init_check_self_review = __esm(() => {
  init_logger();
  init_github();
});

// plugins/speck-reviewer/cli/src/links.ts
function diffLink(file, line) {
  return line ? `${file}:${line}` : file;
}
function fileLink(file, line, endLine) {
  if (line && endLine)
    return `${file}:${line}-${endLine}`;
  if (line)
    return `${file}:${line}`;
  return file;
}
function formatActionMenu(actions) {
  const lines = actions.map((a, i) => `  ${LETTERS[i]}) ${a.label}`);
  return lines.join(`
`);
}
function getReviewActions(reviewBody) {
  const body = reviewBody || "LGTM";
  return [
    { label: "Approve", command: `speck-review review approve "${body}"` },
    {
      label: "Request Changes",
      command: `speck-review review request-changes "Please address the comments"`
    },
    { label: "Comment Only", command: `speck-review review comment "${body}"` }
  ];
}
function getNavActions() {
  return [
    { label: "List files", command: "speck-review files" },
    { label: "List comments", command: "speck-review list-comments" },
    { label: "Show state", command: "speck-review state" }
  ];
}
function escapeForShell(text) {
  return text.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
}
function commentCommand2(file, line, message) {
  const escaped = escapeForShell(message);
  return `speck-review comment ${file} ${line} "${escaped}"`;
}
function formatCommentRow(index, file, line, message) {
  const location = diffLink(file, line);
  return `| ${index} | ${location} | ${message} |`;
}
function formatReviewTable(comments) {
  if (comments.length === 0)
    return "*No comments*";
  const header = `| # | Location | Comment |
|---|----------|---------|`;
  const rows = comments.map((c, i) => formatCommentRow(i + 1, c.file, c.line, c.message));
  const actions = comments.map((c, i) => ({
    label: `Post comment ${i + 1} to ${diffLink(c.file, c.line)}`,
    command: commentCommand2(c.file, c.line, c.message)
  }));
  return `${header}
${rows.join(`
`)}

**Post comments:**
${formatActionMenu(actions)}`;
}
function formatActions() {
  const actions = getNavActions();
  return formatActionMenu(actions);
}
function formatRunActions() {
  const actions = getReviewActions();
  return formatActionMenu(actions);
}
function formatSubmitActions(reviewBody) {
  const actions = getReviewActions(reviewBody);
  return formatActionMenu(actions);
}
function getLogInfo() {
  return `Log files location:
  - Debug: Set SPECK_DEBUG=1 to enable debug logging
  - Log level: Set SPECK_LOG_LEVEL=debug|info|warn|error
  - State: .speck/review-state.json`;
}
var LETTERS = "abcdefghijklmnopqrstuvwxyz";

// plugins/speck-reviewer/cli/src/commands/link.ts
var exports_link = {};
__export(exports_link, {
  linkCommand: () => linkCommand
});
async function linkCommand(args) {
  const file = args[0];
  const line = args[1] ? parseInt(args[1], 10) : undefined;
  const endLine = args[2] ? parseInt(args[2], 10) : undefined;
  if (!file) {
    console.error("Usage: speck-review link <file> [line] [endLine]");
    process.exit(1);
  }
  if (endLine) {
    console.log(fileLink(file, line, endLine));
  } else {
    console.log(diffLink(file, line));
  }
}
var init_link = () => {};

// plugins/speck-reviewer/cli/src/commands/actions.ts
var exports_actions = {};
__export(exports_actions, {
  submitActionsCommand: () => submitActionsCommand,
  runActionsCommand: () => runActionsCommand,
  actionsCommand: () => actionsCommand
});
async function actionsCommand() {
  console.log(`## Navigation Actions
`);
  console.log(formatActions());
}
async function runActionsCommand() {
  console.log(`## Review Actions
`);
  console.log(formatRunActions());
}
async function submitActionsCommand(args) {
  const body = args.join(" ") || undefined;
  console.log(`## Submit Review
`);
  console.log(formatSubmitActions(body));
}
var init_actions = () => {};

// plugins/speck-reviewer/cli/src/commands/review-table.ts
var exports_review_table = {};
__export(exports_review_table, {
  reviewTableCommand: () => reviewTableCommand
});
async function reviewTableCommand(args) {
  const showExample = args.includes("--example");
  if (showExample) {
    console.log(`## Example Review Table
`);
    console.log(formatReviewTable(EXAMPLE_COMMENTS));
    return;
  }
  const repoRoot = process.cwd();
  const state = await loadState(repoRoot);
  if (!state) {
    logger.warn(`No active review session. State path: ${getStatePath(repoRoot)}`);
    console.log(`*No active review session*
`);
    console.log("Use --example to see a sample review table.");
    return;
  }
  const stagedComments = state.comments.filter((c) => c.state === "staged").map((c) => ({
    file: c.file,
    line: c.line,
    message: c.body
  }));
  if (stagedComments.length === 0) {
    console.log(`*No staged comments*
`);
    console.log("Use --example to see a sample review table.");
    return;
  }
  console.log(`## Staged Comments
`);
  console.log(formatReviewTable(stagedComments));
}
var EXAMPLE_COMMENTS;
var init_review_table = __esm(() => {
  init_state();
  init_logger();
  EXAMPLE_COMMENTS = [
    {
      file: "src/services/auth.ts",
      line: 42,
      message: "Consider adding rate limiting to prevent brute force"
    },
    {
      file: "src/services/auth.ts",
      line: 78,
      message: "Nit: JWT_EXPIRY should be configurable via env var"
    },
    {
      file: "src/middleware/requireAuth.ts",
      line: 23,
      message: "Might be worth logging failed auth attempts"
    }
  ];
});

// plugins/speck-reviewer/cli/src/commands/logs.ts
var exports_logs = {};
__export(exports_logs, {
  logsCommand: () => logsCommand
});
async function logsCommand() {
  const repoRoot = process.cwd();
  const statePath = getStatePath(repoRoot);
  console.log(`## Debug & Logging Information
`);
  console.log(getLogInfo());
  console.log(`
Current state file: ${statePath}`);
  console.log(`
### Enable Debug Mode
`);
  console.log("```bash");
  console.log("SPECK_DEBUG=1 speck-review analyze");
  console.log("```");
  console.log(`
### Set Log Level
`);
  console.log("```bash");
  console.log("SPECK_LOG_LEVEL=debug speck-review analyze");
  console.log("```");
}
var init_logs = __esm(() => {
  init_state();
});

// plugins/speck-reviewer/cli/src/index.ts
init_logger();
// plugins/speck-reviewer/cli/package.json
var package_default = {
  name: "speck-review-cli",
  version: "1.1.1",
  description: "CLI for AI-powered PR review with Speck-aware context",
  type: "module",
  main: "src/index.ts",
  bin: {
    "speck-review": "dist/speck-review"
  },
  scripts: {
    build: "bun build src/index.ts --compile --outfile dist/speck-review",
    dev: "bun run src/index.ts",
    test: "bun test",
    typecheck: "tsc --noEmit"
  },
  author: {
    name: "Nathan Prabst"
  },
  license: "MIT",
  engines: {
    bun: ">=1.0.0"
  },
  devDependencies: {
    "@types/bun": "latest",
    typescript: "^5.3.0"
  }
};

// plugins/speck-reviewer/cli/src/index.ts
var VERSION = package_default.version;
var commands = {
  help: async () => {
    printHelp();
  },
  version: async () => {
    console.log(`speck-review ${VERSION}`);
  },
  analyze: async (args) => {
    const { analyzeCommand: analyzeCommand2 } = await Promise.resolve().then(() => (init_analyze(), exports_analyze));
    await analyzeCommand2(args);
  },
  state: async (args) => {
    const { stateCommand: stateCommand2 } = await Promise.resolve().then(() => (init_state2(), exports_state));
    await stateCommand2(args);
  },
  files: async (args) => {
    const { filesCommand: filesCommand2 } = await Promise.resolve().then(() => (init_files(), exports_files));
    await filesCommand2(args);
  },
  "spec-context": async () => {
    const { specContextCommand: specContextCommand2 } = await Promise.resolve().then(() => (init_spec_context(), exports_spec_context));
    await specContextCommand2();
  },
  comment: async (args) => {
    const { commentCommand: commentCommand3 } = await Promise.resolve().then(() => (init_comment(), exports_comment));
    await commentCommand3(args);
  },
  "comment-reply": async (args) => {
    const { commentReplyCommand: commentReplyCommand2 } = await Promise.resolve().then(() => (init_comment(), exports_comment));
    await commentReplyCommand2(args);
  },
  "comment-delete": async (args) => {
    const { commentDeleteCommand: commentDeleteCommand2 } = await Promise.resolve().then(() => (init_comment(), exports_comment));
    await commentDeleteCommand2(args);
  },
  "list-comments": async () => {
    const { listCommentsCommand: listCommentsCommand2 } = await Promise.resolve().then(() => (init_comment(), exports_comment));
    await listCommentsCommand2();
  },
  review: async (args) => {
    const { reviewCommand: reviewCommand2 } = await Promise.resolve().then(() => (init_review(), exports_review));
    await reviewCommand2(args);
  },
  "check-self-review": async (args) => {
    const { checkSelfReviewCommand: checkSelfReviewCommand2 } = await Promise.resolve().then(() => (init_check_self_review(), exports_check_self_review));
    await checkSelfReviewCommand2(args);
  },
  link: async (args) => {
    const { linkCommand: linkCommand2 } = await Promise.resolve().then(() => (init_link(), exports_link));
    await linkCommand2(args);
  },
  actions: async () => {
    const { actionsCommand: actionsCommand2 } = await Promise.resolve().then(() => (init_actions(), exports_actions));
    await actionsCommand2();
  },
  "run-actions": async () => {
    const { runActionsCommand: runActionsCommand2 } = await Promise.resolve().then(() => (init_actions(), exports_actions));
    await runActionsCommand2();
  },
  "review-table": async (args) => {
    const { reviewTableCommand: reviewTableCommand2 } = await Promise.resolve().then(() => (init_review_table(), exports_review_table));
    await reviewTableCommand2(args);
  },
  "submit-actions": async (args) => {
    const { submitActionsCommand: submitActionsCommand2 } = await Promise.resolve().then(() => (init_actions(), exports_actions));
    await submitActionsCommand2(args);
  },
  logs: async () => {
    const { logsCommand: logsCommand2 } = await Promise.resolve().then(() => (init_logs(), exports_logs));
    await logsCommand2();
  }
};
function printHelp() {
  console.log(`
speck-review v${VERSION}
AI-powered PR review with Speck-aware context

USAGE:
  speck-review <command> [arguments]

COMMANDS:
  analyze [pr-number]       Analyze PR and output clustered file groupings
  state [show|clear]        Manage review session state
  files                     List changed files with metadata
  spec-context              Load Speck specification for current branch

  comment <file> <line> <body>    Post a line comment
  comment-reply <id> <body>       Reply to a comment thread
  comment-delete <id>             Delete a comment
  list-comments                   List all PR comments

  review <event> [body]     Submit review (approve|request-changes|comment)
  check-self-review <author> Check if current user is PR author

  link <file> [line]        Generate file:line navigation reference
  actions                   Display navigation action menu
  run-actions               Display review action menu
  review-table [--example]  Generate formatted comment table
  submit-actions [body]     Display submit review menu
  logs                      Display log file locations and debug info

  help, --help, -h          Show this help message
  version, --version, -v    Show version

ENVIRONMENT:
  SPECK_DEBUG=1             Enable debug logging
  SPECK_LOG_LEVEL           Set log level (debug|info|warn|error)
  SPECK_STATE_PATH          Override state file location

EXAMPLES:
  speck-review analyze 142
  speck-review state show
  speck-review comment src/auth.ts 42 "Consider adding rate limiting"
  speck-review review approve

For more information: https://github.com/nprbst/speck
`);
}
async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--version") || args.includes("-v")) {
    commands.version?.([]);
    return;
  }
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    commands.help?.([]);
    return;
  }
  const command = args[0];
  const commandArgs = args.slice(1);
  logger.debug(`Running command: ${command}`, commandArgs);
  if (!command) {
    printHelp();
    process.exit(0);
  }
  const handler = commands[command];
  if (!handler) {
    logger.error(`Unknown command: ${command}`);
    console.error(`Run 'speck-review help' for usage information.`);
    process.exit(1);
  }
  try {
    await handler(commandArgs);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
      logger.debug("Stack trace:", error.stack);
    } else {
      logger.error(String(error));
    }
    process.exit(1);
  }
}
main();
