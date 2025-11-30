---
description: Convert existing tasks into actionable, dependency-ordered GitHub issues for the feature based on available design artifacts.
tools: ['github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Extract prerequisite context from the auto-injected comment in the prompt:
   ```
   <!-- SPECK_PREREQ_CONTEXT
   {"MODE":"single-repo","FEATURE_DIR":"/path/to/specs/010-feature","AVAILABLE_DOCS":["tasks.md"]}
   -->
   ```
   Use FEATURE_DIR to locate tasks.md. All paths are absolute.

   **Fallback**: If the comment is not present (VSCode hook bug), run:
   ```bash
   speck check-prerequisites --json --require-tasks --include-tasks
   ```
   Parse FEATURE_DIR and AVAILABLE_DOCS list.

   Then parse the JSON output to extract FEATURE_DIR and AVAILABLE_DOCS.

1. From FEATURE_DIR, read the tasks.md file.
1. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

**ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL**

1. For each task in the list, use the GitHub MCP server to create a new issue in the repository that is representative of the Git remote.

**UNDER NO CIRCUMSTANCES EVER CREATE ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL**
