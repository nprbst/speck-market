---
description: Install speck-review CLI globally and configure auto-allow permissions
---

## Speck-Reviewer Initialization

This command installs the `speck-review` CLI globally and configures auto-allow permissions for seamless PR reviews.

### What This Does

1. Creates `~/.local/bin` directory if it doesn't exist
2. Creates symlink at `~/.local/bin/speck-review` pointing to the bootstrap script
3. Configures auto-allow permissions for GitHub CLI and speck-review commands
4. Adds `review-state.json` to `.speck/.gitignore`
5. Verifies the installation

### Prerequisites

- Bun runtime installed (https://bun.sh)
- GitHub CLI installed and authenticated (`gh auth login`)

### Installation Steps

Run these commands in order:

```bash
# 1. Create ~/.local/bin if it doesn't exist
mkdir -p ~/.local/bin

# 2. Create symlink to bootstrap.sh
ln -sf "${CLAUDE_PLUGIN_ROOT}/src/cli/bootstrap.sh" ~/.local/bin/speck-review

# 3. Verify installation
speck-review version
```

### Auto-Allow Permissions

After CLI installation succeeds, configure auto-allow permissions by adding these entries to `.claude/settings.local.json` in the repository root. Create the file if it doesn't exist.

**Required permissions:**
```json
{
  "permissions": {
    "allow": [
      "Read(~/.claude/plugins/marketplaces/speck-market/speck-reviewer/skills/**)",
      "Bash(gh pr list:*)",
      "Bash(gh pr view:*)",
      "Bash(gh pr diff:*)",
      "Bash(gh api:*)",
      "Bash(gh auth status:*)",
      "Bash(speck-review:*)"
    ]
  }
}
```

If `.claude/settings.local.json` already exists, merge these permissions into the existing `allow` array. Do not remove existing permissions.

### Configure .gitignore

Add `review-state.json` to `.speck/.gitignore` to prevent committing machine-specific review state.

**If `.speck/.gitignore` exists:** Read it, and if `review-state.json` is not already present, add it to the file using the Edit tool.

**If `.speck/.gitignore` does not exist:** Create it with:
```
# Machine-specific files
review-state.json
```

### PATH Configuration

If `speck-review version` fails with "command not found", add `~/.local/bin` to your PATH.

**For zsh** (`~/.zshrc`):
```bash
export PATH="$HOME/.local/bin:$PATH"
```

**For bash** (`~/.bashrc`):
```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then reload your shell: `source ~/.zshrc` or `source ~/.bashrc`

### Verification

After installation, verify the CLI is working:

```bash
which speck-review
speck-review help
gh auth status
```

If `which speck-review` returns `~/.local/bin/speck-review`, the installation was successful.
