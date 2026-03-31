#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/lint-target.sh <target-directory> [oxlint-args...]

Run this repository's current Oxlint policy against another project's directory.

Example:
  ./scripts/lint-target.sh /Users/alex/development/projects/date-maker
  ./scripts/lint-target.sh /Users/alex/development/projects/date-maker --format unix
EOF
}

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 1
fi

if [[ "$1" == "-h" || "$1" == "--help" ]]; then
  usage
  exit 0
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "$script_dir/.." && pwd)"
config_path="$repo_dir/src/oxlint/oxlint.config.ts"
oxlint_bin="$repo_dir/node_modules/.bin/oxlint"
target_dir="$1"
shift

if [[ ! -d "$target_dir" ]]; then
  echo "error: target directory does not exist: $target_dir" >&2
  exit 1
fi

if [[ ! -f "$config_path" ]]; then
  echo "error: config file does not exist: $config_path" >&2
  exit 1
fi

if [[ ! -x "$oxlint_bin" ]]; then
  echo "error: oxlint binary is not executable: $oxlint_bin" >&2
  echo "Run 'bun install' in $repo_dir first." >&2
  exit 1
fi

target_dir="$(cd -- "$target_dir" && pwd -P)"

echo "==> oxlint"
echo "config: $config_path"
echo "target: $target_dir"

(
  cd -- "$target_dir"
  "$oxlint_bin" \
    --config "$config_path" \
    --disable-nested-config \
    "$@" \
    .
)
