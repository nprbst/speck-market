---
description: Check Speck plugin environment and configuration
---

## User Input

```text
$ARGUMENTS
```

## Environment Check

Run the Speck environment check command:

```bash
speck env --json
```

## Present Results

Parse the JSON output and present a summary to the user.

**Required sections:**
1. **Mode**: Single-repo or Multi-repo (root/child)
2. **Paths**: Repository root, specs directory, speck root (if multi-repo)
3. **Current Branch**: The active git branch
4. **Branch Mappings**: Any feature branch → spec mappings
5. **Warnings**: Any configuration issues detected

**If errors occur**, explain the issue and suggest remediation steps.

**Example output format:**

| Setting | Value |
|---------|-------|
| Mode | Multi-repo (Child) |
| Repo Root | /path/to/backend |
| Speck Root | /path/to/multi-repo-root |
| Current Branch | 002-cross-repo-auth |
| Branch Mappings | 1 mapping(s) |

If the command fails or `ok: false` in JSON, display the error and recovery suggestions.
