---
description: Install Speck CLI globally via symlink to ~/.local/bin/speck
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Speck CLI Installation

This command installs the `speck` CLI globally by creating a symlink at `~/.local/bin/speck`.

### Installation Flow

1. **Bootstrap Script**: The symlink initially points to `bootstrap.sh`
2. **First Run**: Bootstrap detects Bun, creates `.runner.sh`, rewires the symlink
3. **Subsequent Runs**: Symlink points directly to `.runner.sh` (zero overhead)

### Run Installation

```bash
# Run the init command
bun run src/cli/index.ts init

# Or if speck is already available in PATH:
# speck init
```

### Verify Installation

After running, verify the installation:

```bash
# Check symlink exists
ls -la ~/.local/bin/speck

# Test the CLI
~/.local/bin/speck --help
```

### PATH Configuration

If `~/.local/bin` is not in your PATH, add this to your shell config:

**For bash** (`~/.bashrc`):
```bash
export PATH="$HOME/.local/bin:$PATH"
```

**For zsh** (`~/.zshrc`):
```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### Options

- `--force`: Force reinstall even if symlink already exists
- `--json`: Output result as JSON

### Troubleshooting

If installation fails:

1. **Bun not installed**: The bootstrap script will show platform-specific install instructions
2. **Permission denied**: Ensure you have write access to `~/.local/bin`
3. **PATH not set**: Add `~/.local/bin` to your PATH as shown above

## Context

$ARGUMENTS
