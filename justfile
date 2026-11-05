set dotenv-load := false
set positional-arguments

default:
    @just --list

# Install the locked development dependencies
setup:
    bun install --frozen-lockfile

# Run the CLI from source
run *args:
    bun src/cli/cli.ts "$@"

# Run the CLI in agent mode
run-ai *args:
    AGENT=1 bun src/cli/cli.ts "$@"

fmt:
    just --fmt
    bun run oxfmt .

fmt-check:
    just --fmt --check
    bun run oxfmt --check .

lint:
    bun run --bun oxlint --deny-warnings .

fix:
    bun run --bun oxlint --fix .
    just --fmt
    bun run oxfmt .

typecheck:
    bun run tsc --noEmit

unused:
    bun run --bun ts-unused check tsconfig.json

# Run tests with owned fixtures, caches and descendant processes
test *args:
    NODE_DISABLE_COMPILE_CACHE=1 bun scripts/runTests.ts "$@"

# Require complete production coverage and 90% weighted lines and functions
test-coverage:
    NODE_DISABLE_COMPILE_CACHE=1 POLICY_CHECK_COVERAGE=1 bun scripts/runTests.ts

# Produce the published package files
build *args:
    bun run tsdown "$@"

# Validate the build without changing existing output
build-check:
    bun run tsdown --no-write --no-clean

fix-semantic *args:
    bun src/cli/cli.ts fix-semantic "$@"

lint-target *args:
    ./scripts/lint-target.sh "$@"

# Validate without changing source or leaving build/test output
check: fmt-check lint typecheck unused build-check test-coverage
