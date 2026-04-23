#!/usr/bin/env bash
# Evaluator for the tsb-perf-evolve OpenEvolve program.
#
# Both the autoloop agent (Step 6 of the OpenEvolve playbook) and CI (the
# `benchmark` job in .github/workflows/ci.yml) invoke this script so they
# produce comparable fitness numbers from identical commands.
#
# Output: a single JSON line on stdout with one of these shapes
#   {"fitness": <number>, "tsb_mean_ms": <number>, "pandas_mean_ms": <number>}
#   {"fitness": null,     "rejected_reason": "<string>"}
#
# Exit code is always 0 — failures are encoded in the JSON so callers can
# parse the result uniformly. Diagnostics go to stderr.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$REPO_ROOT"

# 1. Validity — existing tests for sortValues must still pass.
if ! bun test tests/core/series.sortValues.test.ts >/tmp/perf-evolve-tests.log 2>&1; then
  echo '{"fitness": null, "rejected_reason": "tests failed"}'
  exit 0
fi

# 2. Benchmark — tsb side.
tsb_ms=$(bun run "$SCRIPT_DIR/code/benchmark.ts" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['mean_ms'])")

# 3. Benchmark — pandas side. Skip gracefully if pandas isn't available.
if ! python3 -c 'import pandas' 2>/dev/null; then
  pip3 install pandas --quiet 2>/dev/null || true
fi
pd_ms=$(python3 "$SCRIPT_DIR/code/benchmark.py" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['mean_ms'])")

# 4. Fitness = ratio. Lower is better.
ratio=$(python3 -c "print(${tsb_ms} / ${pd_ms})")
echo "{\"fitness\": ${ratio}, \"tsb_mean_ms\": ${tsb_ms}, \"pandas_mean_ms\": ${pd_ms}}"
