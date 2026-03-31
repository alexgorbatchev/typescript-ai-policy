#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "$script_dir/.." && pwd)"

cd "$repo_dir"

echo "==> oxfmt"
bun x oxfmt --check .

echo "==> oxlint"
bun x oxlint .

echo "==> tsgo"
bun x tsgo --noEmit

echo "==> bun test"
bun test
