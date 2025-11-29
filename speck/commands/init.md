---
description: Install Speck CLI globally via symlink to ~/.local/bin/speck
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Speck Initialization

This command initializes Speck in the current repository and optionally installs the CLI globally.

### What This Does

1. **Creates `.speck/` directory** in the current repository with:
   - `memory/` - For constitution.md and other memory files
   - `scripts/` - For custom scripts
2. **Configures plugin permissions** in `.claude/settings.local.json` to allow reading from Speck's template files without prompts (this file is gitignored)
3. **Installs CLI symlink** at `~/.local/bin/speck`
4. **Suggests next step** - prompts to run `/speck:constitution` if needed

### Run Initialization

First, check if `speck` is already available in PATH:

```bash
which speck && speck init || bun $HOME/.claude/plugins/marketplaces/speck-market/speck/dist/speck-cli.js init
```

This is idempotent - if `speck` is already installed and in PATH, it will use the installed version. Otherwise, it falls back to the plugin path for initial installation.

### Options

- `--force`: Force reinstall even if symlink already exists
- `--json`: Output result as JSON

### PATH Configuration

If `~/.local/bin` is not in your PATH, add this to your shell config:

**For bash** (`~/.bashrc`) or **zsh** (`~/.zshrc`):
```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then reload: `source ~/.bashrc` or `source ~/.zshrc`

### Next Steps

After initialization completes successfully:

1. **Restart Claude Code** - Exit this session and start a new one for permission changes to take effect
2. **Set up your constitution** - Run `/speck:constitution` to define your project principles

**Important**: The permission configuration in `.claude/settings.local.json` requires a Claude Code restart to take effect. Without restarting, you may still see permission prompts when reading template files.

## Context

$ARGUMENTS
