---
description: Review a GitHub pull request with Speck-aware context
argument-hint: [pr-number]
---

## Prerequisites Check

**Before proceeding, verify the speck-review CLI is installed:**

```bash
which speck-review
```

**If the command is not found**, stop and ask the user to run `/speck-reviewer:init` first:

> The `speck-review` CLI is not installed. Please run `/speck-reviewer:init` to install it globally, then try this command again.

**Do not continue with the review if speck-review is not available.** The CLI is required for PR analysis, state management, and comment posting.

---

# PR Review Command

First, use the Read tool to load the skill instructions from
`${CLAUDE_PLUGIN_ROOT}/skills/pr-review/SKILL.md`, then follow those
instructions to review the specified PR.

## Arguments

- `$ARGUMENTS`: Optional PR number. If not provided, detects the current PR from
  the checked-out branch or finds PRs where user is assigned/requested.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth login`)
- Git repository with PR access

## Planning Phase

Execute these steps in order:

### 1. Identify PR

If PR number provided: `$ARGUMENTS` If no PR number: Find open PRs where user is
assigned or requested as reviewer using the method in the skill.

### 2. Load Existing State

Check for existing review state:

```bash
speck-review state show
```

If state exists for this PR:

- Show progress summary (reviewed clusters, pending comments)
- Offer to resume or start fresh
- If resuming, skip to walkthrough with current progress

If state is for a different PR or branch:

- Warn about stale state
- Offer to clear and start fresh

### 3. Fetch PR Metadata

```bash
gh pr view <PR_NUMBER> --json title,body,state,author,baseRefName,headRefName,additions,deletions,changedFiles,url
```

### 4. Run Clustering Analysis

```bash
speck-review analyze <PR_NUMBER>
```

This returns heuristic clusters. Refine them using LLM augmentation as described
in the skill.

### 5. Check Self-Review Mode

```bash
speck-review check-self-review <PR_AUTHOR>
```

### 6. Load Speck Context (if available)

```bash
speck-review spec-context
```

If spec exists for the branch, include requirements in review context. If no
spec, proceed with standard review (graceful degradation).

### 7. Generate PR Narrative

Using the PR body, commit history, and cluster analysis, generate a narrative
that:

- References what the author said in the PR description
- Explains the story of changes
- Highlights cross-cutting concerns (config, deps, migrations)

### 8. Present Cluster Overview

Show the refined clusters with:

- Semantic names (not just directory paths)
- Why each cluster matters
- Dependencies between clusters
- Priority order for review

### 9. Initialize State

Use the Write tool to save the initial review state to
`.speck/review-state.json` with:

- PR metadata (number, title, author, branches)
- Generated narrative
- Refined clusters
- Review mode (normal or self-review)

See the state schema in SKILL.md for the exact JSON structure.

### 10. Begin Guided Walkthrough

Start the cluster-by-cluster review as described in the skill.

## Quick Commands

During review, users can say:

- "next" - advance to next cluster
- "back" - return to previous cluster
- "where am I?" - show current progress
- "show clusters" - list all clusters with status
- "skip 2" - skip comment #2
- "restore 2" - bring back skipped comment
- "reword 1 to be friendlier" - modify comment #1
- "post 1, 3" - post specific comments
- "post all" - post all staged comments
- "post all then approve" - post staged comments and approve PR
