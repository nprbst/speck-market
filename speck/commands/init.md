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
2. **Creates `.speck/config.json`** with user preferences for worktree mode and IDE settings
3. **Configures plugin permissions** in `.claude/settings.local.json` to allow reading from Speck's template files without prompts (this file is gitignored)
4. **Installs CLI symlink** at `~/.local/bin/speck`
5. **Suggests next step** - prompts to run `/speck:constitution` if needed

### Configuration Prompts

Before running `speck init`, ask the user about their preferences:

1. **Worktree Mode** (default: enabled)
   - Ask: "Enable worktree mode? This creates isolated directories for each feature branch. (Y/n)"
   - If user says "n" or "no", set `--worktree-enabled false`
   - If user says "y", "yes", or presses enter, set `--worktree-enabled true`

2. **IDE Auto-Launch** (default: disabled)
   - Ask: "Auto-launch IDE when creating features? (y/N)"
   - If user says "y" or "yes", set `--ide-autolaunch true` and proceed to ask which IDE
   - If user says "n", "no", or presses enter, skip IDE settings

3. **IDE Editor** (only if auto-launch enabled)
   - Ask: "Which IDE? (vscode/cursor/webstorm/idea/pycharm) [vscode]"
   - Use the user's choice or "vscode" as default

### Run Initialization

After collecting user preferences, run:

```bash
which speck && speck init [FLAGS] || bun $HOME/.claude/plugins/marketplaces/speck-market/speck/dist/speck-cli.js init [FLAGS]
```

Replace `[FLAGS]` with the appropriate flags based on user responses:
- `--worktree-enabled true` or `--worktree-enabled false`
- `--ide-autolaunch true` (if enabled)
- `--ide-editor <choice>` (if IDE auto-launch is enabled)

Example with all options:
```bash
speck init --worktree-enabled true --ide-autolaunch true --ide-editor cursor
```

Example with defaults (worktree enabled, no IDE auto-launch):
```bash
speck init --worktree-enabled true
```

### Options

- `--force`: Force reinstall even if symlink already exists
- `--json`: Output result as JSON
- `--worktree-enabled <true|false>`: Enable or disable worktree mode
- `--ide-autolaunch <true|false>`: Enable or disable IDE auto-launch
- `--ide-editor <editor>`: IDE editor choice (vscode/cursor/webstorm/idea/pycharm)

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
