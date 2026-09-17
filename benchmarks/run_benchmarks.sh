#!/usr/bin/env bash
# Run Python/TypeScript comparisons and explicitly registered Rust/Wasm kernels.
# Schema 3 retains per-backend failures and unsupported/not-selected outcomes.
# BENCHMARK_FILTER=join,rolling_mean selects exact pair names for a cheap probe.
# BENCHMARK_STRICT=1 fails if any selected pair fails; Pages defaults to publishing
# an explicitly incomplete report. BENCHMARK_WORKERS=8, BENCHMARK_TIMEOUT=30.
# Use BENCHMARK_WORKERS=1 for isolated performance comparisons.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 is required but not found" >&2
  exit 1
fi
python3 -c "import pandas" 2>/dev/null || {
  echo "Installing pandas..."
  pip3 install pandas --quiet --break-system-packages 2>/dev/null || pip3 install pandas --quiet
}

# Resolve TypeScript runner: prefer Bun, retaining the existing tsx fallback.
TS_RUNNER=""
if command -v bun &>/dev/null; then
  TS_RUNNER="bun"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  TS_RUNNER="$HOME/.bun/bin/bun"
elif [ -x "/tmp/gh-aw/agent/node_modules/.bin/tsx" ]; then
  TS_RUNNER="/tmp/gh-aw/agent/node_modules/.bin/tsx"
elif command -v npx &>/dev/null; then
  npm install tsx --prefix /tmp/gh-aw/agent --save-dev --silent 2>/dev/null || true
  TS_RUNNER="/tmp/gh-aw/agent/node_modules/.bin/tsx"
fi
if [ -z "$TS_RUNNER" ] || { ! [ -x "$TS_RUNNER" ] && ! command -v "$TS_RUNNER" &>/dev/null; }; then
  echo "ERROR: no TypeScript runner found (bun or tsx required)" >&2
  exit 1
fi

python3 "$SCRIPT_DIR/runner.py" --repo-root "$REPO_ROOT" --ts-runner "$TS_RUNNER"
