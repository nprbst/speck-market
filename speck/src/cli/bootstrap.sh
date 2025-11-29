#!/bin/bash

# bootstrap.sh - Cross-platform Bun bootstrap wrapper
#
# Feature: 015-scope-simplification
# Tasks: T058-T058f
#
# On first run: checks for bun, guides installation, then rewires itself out
# After setup: symlink points directly to runner, zero overhead
#
# Flow:
#   User runs `speck` (symlink → bootstrap.sh)
#            ↓
#       Check for Bun
#            ↓
#       ┌────┴────┐
#       │         │
#     Found    Not Found
#       │         │
#       ↓         ↓
#   Create     Show platform-specific
#   .runner.sh install instructions
#       │         │
#       ↓         ↓
#   Rewire     Exit with
#   symlink    helpful message
#       │
#       ↓
#   Exec entrypoint
#   (this time and forever after)

set -e

# Resolve the actual script path (follow symlinks)
SOURCE="${BASH_SOURCE[0]}"
while [[ -L "$SOURCE" ]]; do
    DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
    SOURCE="$(readlink "$SOURCE")"
    # If SOURCE was a relative symlink, resolve it relative to the symlink's directory
    [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"

# Look for bundled CLI first, fall back to TypeScript source for development
if [[ -f "${SCRIPT_DIR}/../../.speck/dist/speck-cli.js" ]]; then
    ENTRYPOINT="${SCRIPT_DIR}/../../.speck/dist/speck-cli.js"
elif [[ -f "${SCRIPT_DIR}/index.ts" ]]; then
    ENTRYPOINT="${SCRIPT_DIR}/index.ts"
else
    echo "Error: Could not find speck CLI entrypoint"
    exit 1
fi

# =============================================================================
# T058a: Platform Detection
# =============================================================================

detect_platform() {
    case "$(uname -s)" in
        Darwin*)  echo "macos" ;;
        Linux*)
            if grep -qi microsoft /proc/version 2>/dev/null; then
                echo "wsl"
            else
                echo "linux"
            fi
            ;;
        *)        echo "unknown" ;;
    esac
}

# =============================================================================
# T058c: Install Instructions
# =============================================================================

install_instructions() {
    local platform
    platform=$(detect_platform)

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Bun is not installed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Install with:"
    echo ""
    echo "  curl -fsSL https://bun.sh/install | bash"
    echo ""

    case "$platform" in
        macos)
            echo "Or via Homebrew:"
            echo ""
            echo "  brew install oven-sh/bun/bun"
            echo ""
            ;;
        wsl)
            echo "Note: You're running in WSL. After installing, you may need to"
            echo "restart your terminal or run: source ~/.bashrc"
            echo ""
            ;;
    esac

    echo "After installing, run this command again to complete setup."
    echo ""
}

# =============================================================================
# T058b: Find Bun
# =============================================================================

find_bun() {
    # Check common locations in order of preference
    local bun_paths=(
        "$HOME/.bun/bin/bun"
        "/usr/local/bin/bun"
        "/opt/homebrew/bin/bun"
    )

    # First check if it's in PATH
    if command -v bun &>/dev/null; then
        command -v bun
        return 0
    fi

    # Check common install locations
    for path in "${bun_paths[@]}"; do
        if [[ -x "$path" ]]; then
            echo "$path"
            return 0
        fi
    done

    return 1
}

# =============================================================================
# T058e: Update Symlink
# =============================================================================

update_symlink() {
    local symlink_path="$1"

    # Only update if it's a symlink pointing to bootstrap.sh
    if [[ -L "$symlink_path" ]]; then
        local current_target
        current_target=$(readlink "$symlink_path")
        if [[ "$current_target" == *"bootstrap.sh" ]]; then
            rm "$symlink_path"
            # Point directly to index.ts - shebang handles execution
            ln -s "$ENTRYPOINT" "$symlink_path"
            return 0
        fi
    fi
    return 1
}

# =============================================================================
# Main Entry Point
# =============================================================================

main() {
    local bun_path

    if ! bun_path=$(find_bun); then
        install_instructions
        exit 1
    fi

    echo "Found Bun at: $bun_path"

    # Try to update the symlink to point directly to index.ts
    local symlink_candidates=(
        "$HOME/.local/bin/speck"
        "/usr/local/bin/speck"
    )

    for symlink in "${symlink_candidates[@]}"; do
        if update_symlink "$symlink"; then
            echo "Updated symlink: $symlink → index.ts"
            echo "Future runs will execute directly (zero bootstrap overhead)."
            break
        fi
    done

    echo ""

    # Run the entrypoint this time
    exec "$bun_path" "$ENTRYPOINT" "$@"
}

main "$@"
