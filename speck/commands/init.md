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
2. **Installs CLI symlink** at `~/.local/bin/speck`
3. **Suggests next step** - prompts to run `/speck:constitution` if needed

### Run Initialization

```bash
bun $HOME/.claude/plugins/marketplaces/speck-market/speck/dist/speck-cli.js init
```

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

After initialization, follow the suggested next step to set up your project constitution:
- Run `/speck:constitution` to define your project principles

## Context

$ARGUMENTS
