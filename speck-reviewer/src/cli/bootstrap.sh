#!/bin/bash

# bootstrap.sh - Cross-platform Bun bootstrap wrapper for speck-review
#
# Finds Bun and executes the bundled CLI. Simple wrapper, no rewiring.

set -e

# Resolve the actual script path (follow symlinks)
SOURCE="${BASH_SOURCE[0]}"
while [[ -L "$SOURCE" ]]; do
    DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
    SOURCE="$(readlink "$SOURCE")"
    [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"

# Find the bundled CLI relative to bootstrap.sh
# Plugin structure: speck-reviewer/src/cli/bootstrap.sh -> speck-reviewer/dist/speck-review.js
ENTRYPOINT="${SCRIPT_DIR}/../../dist/speck-review.js"

if [[ ! -f "$ENTRYPOINT" ]]; then
    echo "Error: Could not find speck-review CLI at: $ENTRYPOINT"
    echo "The plugin may not be properly installed."
    exit 1
fi

# Find Bun
find_bun() {
    local bun_paths=(
        "$HOME/.bun/bin/bun"
        "/usr/local/bin/bun"
        "/opt/homebrew/bin/bun"
    )

    if command -v bun &>/dev/null; then
        command -v bun
        return 0
    fi

    for path in "${bun_paths[@]}"; do
        if [[ -x "$path" ]]; then
            echo "$path"
            return 0
        fi
    done

    return 1
}

# Show install instructions
install_instructions() {
    echo ""
    echo "Bun is not installed"
    echo ""
    echo "Install with:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    echo ""
    if [[ "$(uname -s)" == "Darwin" ]]; then
        echo "Or via Homebrew:"
        echo "  brew install oven-sh/bun/bun"
        echo ""
    fi
    echo "After installing, run this command again."
    echo ""
}

# Main
main() {
    local bun_path

    if ! bun_path=$(find_bun); then
        install_instructions
        exit 1
    fi

    exec "$bun_path" "$ENTRYPOINT" "$@"
}

main "$@"
