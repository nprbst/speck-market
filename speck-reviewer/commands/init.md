---
description: Install speck-review CLI globally via symlink to ~/.local/bin/speck-review
---

## Speck-Reviewer Initialization

This command installs the `speck-review` CLI globally so it can be run from anywhere.

### What This Does

1. Creates `~/.local/bin` directory if it doesn't exist
2. Creates symlink at `~/.local/bin/speck-review` pointing to the bootstrap script
3. Verifies the installation

### Prerequisites

- Bun runtime installed (https://bun.sh)

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
```

If `which speck-review` returns `~/.local/bin/speck-review`, the installation was successful.
