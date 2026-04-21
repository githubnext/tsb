#!/usr/bin/env bash
#
# Run all tsb (TypeScript) and pandas (Python) benchmarks and collect results.
#
# Usage: ./benchmarks/run_benchmarks.sh
#
# Outputs: benchmarks/results.json with all benchmark results
#
# Environment variables:
#   BENCHMARK_WORKERS  — parallel worker count (default: 8)
#   BENCHMARK_TIMEOUT  — per-benchmark timeout in seconds (default: 30)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKERS="${BENCHMARK_WORKERS:-8}"
TIMEOUT="${BENCHMARK_TIMEOUT:-30}"

# Ensure Python and pandas are available
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 is required but not found" >&2
  exit 1
fi

python3 -c "import pandas" 2>/dev/null || {
  echo "Installing pandas..."
  pip3 install pandas --quiet --break-system-packages 2>/dev/null || pip3 install pandas --quiet
}

# Detect TypeScript runner: prefer bun, fall back to tsx
TS_RUNNER=""
if command -v bun &>/dev/null; then
  TS_RUNNER="bun run"
elif [ -x "/tmp/gh-aw/agent/node_modules/.bin/tsx" ]; then
  TS_RUNNER="/tmp/gh-aw/agent/node_modules/.bin/tsx"
elif command -v npx &>/dev/null; then
  # Try to install tsx locally if not found
  npm install tsx --prefix /tmp/gh-aw/agent --silent 2>/dev/null || true
  if [ -x "/tmp/gh-aw/agent/node_modules/.bin/tsx" ]; then
    TS_RUNNER="/tmp/gh-aw/agent/node_modules/.bin/tsx"
  fi
fi

if [ -z "$TS_RUNNER" ]; then
  # Last resort: try to install bun
  curl -fsSL https://bun.sh/install | bash 2>/dev/null || true
  export PATH="$HOME/.bun/bin:$PATH"
  if command -v bun &>/dev/null; then
    TS_RUNNER="bun run"
  fi
fi

if [ -z "$TS_RUNNER" ]; then
  echo "ERROR: No TypeScript runner found (tried bun, tsx, npx tsx). Cannot run benchmarks." >&2
  exit 1
fi

export TS_RUNNER
echo "Using TS runner: $TS_RUNNER"

# Install JS dependencies so benchmark scripts can import from src/
(cd "$REPO_ROOT" && bun install --silent 2>/dev/null) || \
  (cd "$REPO_ROOT" && npm install --silent 2>/dev/null) || \
  echo "WARN: dependency install failed; benchmarks may fail" >&2

# Temp directory for per-benchmark result files
TMPDIR_RESULTS="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_RESULTS"' EXIT

echo "=== Running Performance Benchmarks (${WORKERS} workers, ${TIMEOUT}s timeout) ==="
echo ""

# Build list of benchmark pairs (bench_name lines)
PAIRS_FILE="$(mktemp)"
for ts_bench in "$SCRIPT_DIR"/tsb/bench_*.ts; do
  [ -f "$ts_bench" ] || continue
  bench_name=$(basename "$ts_bench" .ts | sed 's/^bench_//')
  py_bench="$SCRIPT_DIR/pandas/bench_${bench_name}.py"
  [ -f "$py_bench" ] && echo "$bench_name" >> "$PAIRS_FILE"
done

TOTAL=$(wc -l < "$PAIRS_FILE" | tr -d ' ')
echo "Found $TOTAL benchmark pairs to run."
echo ""

# Worker function: run one benchmark pair and write result to temp file
run_one() {
  local bench_name="$1"
  local ts_bench="$SCRIPT_DIR/tsb/bench_${bench_name}.ts"
  local py_bench="$SCRIPT_DIR/pandas/bench_${bench_name}.py"
  local out_file="$TMPDIR_RESULTS/${bench_name}.json"
  local ts_tmp="$TMPDIR_RESULTS/${bench_name}.ts_raw"
  local py_tmp="$TMPDIR_RESULTS/${bench_name}.py_raw"

  # Run TypeScript benchmark with timeout; write raw output to temp file
  if [[ "$TS_RUNNER" == "bun run" ]]; then
    timeout "$TIMEOUT" bun run "$ts_bench" > "$ts_tmp" 2>/dev/null || { rm -f "$ts_tmp"; return 0; }
  else
    timeout "$TIMEOUT" $TS_RUNNER "$ts_bench" > "$ts_tmp" 2>/dev/null || { rm -f "$ts_tmp"; return 0; }
  fi
  [ -s "$ts_tmp" ] || { rm -f "$ts_tmp"; return 0; }

  # Run Python benchmark with timeout; write raw output to temp file
  timeout "$TIMEOUT" python3 "$py_bench" > "$py_tmp" 2>/dev/null || { rm -f "$ts_tmp" "$py_tmp"; return 0; }
  [ -s "$py_tmp" ] || { rm -f "$ts_tmp" "$py_tmp"; return 0; }

  # Parse both JSON results and write combined entry via Python (safe, no quoting issues)
  python3 - "$bench_name" "$out_file" "$ts_tmp" "$py_tmp" <<'PYEOF'
import json, sys, os
bench_name, out_file, ts_file, py_file = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
try:
    ts_data = json.loads(open(ts_file).read().strip())
    py_data = json.loads(open(py_file).read().strip())
    ts_mean = float(ts_data["mean_ms"])
    py_mean = float(py_data["mean_ms"])
    ratio = round(ts_mean / py_mean, 3) if py_mean > 0 else None
    entry = {"function": bench_name, "tsb": ts_data, "pandas": py_data, "ratio": ratio}
    with open(out_file, "w") as f:
        json.dump(entry, f)
    print(f"OK: {bench_name}")
except Exception as e:
    print(f"FAIL: {bench_name}: {e}", file=sys.stderr)
finally:
    for p in [ts_file, py_file]:
        try: os.unlink(p)
        except: pass
PYEOF
}

export -f run_one
export SCRIPT_DIR REPO_ROOT TMPDIR_RESULTS TIMEOUT TS_RUNNER

# Run pairs in parallel
xargs -P "$WORKERS" -I{} bash -c 'run_one "$@"' _ {} < "$PAIRS_FILE"
rm -f "$PAIRS_FILE"

# Merge result files into results.json
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
python3 - "$TMPDIR_RESULTS" "$SCRIPT_DIR/results.json" "$TIMESTAMP" <<'PYEOF'
import json, os, sys
results_dir, out_path, timestamp = sys.argv[1], sys.argv[2], sys.argv[3]

benchmarks = []
for fn in sorted(os.listdir(results_dir)):
    if fn.endswith(".json"):
        try:
            with open(os.path.join(results_dir, fn)) as f:
                benchmarks.append(json.load(f))
        except Exception:
            pass

data = {"benchmarks": benchmarks, "timestamp": timestamp}
with open(out_path, "w") as f:
    json.dump(data, f, indent=2)

print(f"=== Results written to {out_path} ===")
print(f"Functions benchmarked: {len(benchmarks)} / {len(os.listdir(results_dir))}")
PYEOF
