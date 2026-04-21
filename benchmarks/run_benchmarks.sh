#!/usr/bin/env bash
#
# Run all tsb (TypeScript) and pandas (Python) benchmarks and collect results.
# Uses parallel execution (BENCHMARK_WORKERS, default 8) with per-benchmark timeout.
#
# Usage: ./benchmarks/run_benchmarks.sh
#
# Outputs: benchmarks/results.json with all benchmark results
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKERS="${BENCHMARK_WORKERS:-8}"
TIMEOUT="${BENCHMARK_TIMEOUT:-30}"
TMPDIR_RESULTS="$(mktemp -d /tmp/bench_results_XXXXXX)"
trap 'rm -rf "$TMPDIR_RESULTS"' EXIT

# Ensure Python and pandas are available
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 is required but not found" >&2
  exit 1
fi
python3 -c "import pandas" 2>/dev/null || {
  echo "Installing pandas..."
  pip3 install pandas --quiet --break-system-packages 2>/dev/null || pip3 install pandas --quiet
}

# Resolve TypeScript runner: prefer bun, fall back to tsx
TS_RUNNER=""
if command -v bun &>/dev/null; then
  TS_RUNNER="bun"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  TS_RUNNER="$HOME/.bun/bin/bun"
elif [ -x "/tmp/gh-aw/agent/node_modules/.bin/tsx" ]; then
  TS_RUNNER="/tmp/gh-aw/agent/node_modules/.bin/tsx"
elif command -v npx &>/dev/null; then
  # Install tsx on demand
  npm install tsx --prefix /tmp/gh-aw/agent --save-dev --silent 2>/dev/null || true
  TS_RUNNER="/tmp/gh-aw/agent/node_modules/.bin/tsx"
fi
if [ -z "$TS_RUNNER" ] || ! [ -x "$TS_RUNNER" ] && ! command -v "$TS_RUNNER" &>/dev/null; then
  echo "ERROR: no TypeScript runner found (bun or tsx required)" >&2
  exit 1
fi
echo "Using TS runner: $TS_RUNNER"

# Write a helper script that runs one benchmark pair and writes JSON to a temp file.
# This avoids function-export complexity with xargs subshells.
PAIR_RUNNER="$TMPDIR_RESULTS/run_pair.sh"
cat > "$PAIR_RUNNER" << 'PAIR_RUNNER_EOF'
#!/usr/bin/env bash
set -euo pipefail
bench_name="$1"
script_dir="$2"
repo_root="$3"
ts_runner="$4"
timeout_s="$5"
out_dir="$6"

ts_bench="$script_dir/tsb/bench_${bench_name}.ts"
py_bench="$script_dir/pandas/bench_${bench_name}.py"
out_file="$out_dir/${bench_name}.json"

[ -f "$ts_bench" ] && [ -f "$py_bench" ] || exit 0

# Capture TS and Python output to temp files to avoid quoting issues
ts_tmp="$out_dir/${bench_name}.ts.tmp"
py_tmp="$out_dir/${bench_name}.py.tmp"

(cd "$repo_root" && timeout "$timeout_s" "$ts_runner" "$ts_bench" > "$ts_tmp" 2>/dev/null) || exit 0
(cd "$repo_root" && timeout "$timeout_s" python3 "$py_bench" > "$py_tmp" 2>/dev/null) || exit 0

# Use Python to merge results (handles edge cases, no shell-quoting issues)
python3 - "$bench_name" "$ts_tmp" "$py_tmp" "$out_file" << 'PYEOF'
import sys, json
bench, ts_f, py_f, out_f = sys.argv[1:]
try:
    with open(ts_f) as f: ts = json.loads(f.read().strip())
    with open(py_f) as f: py = json.loads(f.read().strip())
    py_mean = float(py.get('mean_ms', 0))
    ts_mean = float(ts.get('mean_ms', 0))
    if py_mean <= 0: sys.exit(1)
    ratio = round(ts_mean / py_mean, 3)
    entry = {'function': bench, 'tsb': ts, 'pandas': py, 'ratio': ratio}
    with open(out_f, 'w') as f: json.dump(entry, f)
except Exception: sys.exit(1)
PYEOF
PAIR_RUNNER_EOF
chmod +x "$PAIR_RUNNER"

echo "=== Running Performance Benchmarks (workers=$WORKERS, timeout=${TIMEOUT}s) ==="

# Collect all benchmark names that have matching TS+Python pairs
bench_names=()
for ts_bench in "$SCRIPT_DIR"/tsb/bench_*.ts; do
  [ -f "$ts_bench" ] || continue
  bench_name=$(basename "$ts_bench" .ts | sed 's/^bench_//')
  py_bench="$SCRIPT_DIR/pandas/bench_${bench_name}.py"
  [ -f "$py_bench" ] && bench_names+=("$bench_name")
done

total=${#bench_names[@]}
echo "Found $total benchmark pairs — running with $WORKERS parallel workers..."

# Run all pairs in parallel via xargs
printf '%s\n' "${bench_names[@]}" | \
  xargs -P "$WORKERS" -I{} bash "$PAIR_RUNNER" "{}" "$SCRIPT_DIR" "$REPO_ROOT" "$TS_RUNNER" "$TIMEOUT" "$TMPDIR_RESULTS" || true

# Merge all per-benchmark JSON files into results.json
python3 - "$SCRIPT_DIR/results.json" "$TMPDIR_RESULTS" "$total" << 'PYEOF'
import sys, json, os, glob
from datetime import datetime, timezone

out_file = sys.argv[1]
tmp_dir = sys.argv[2]

benchmarks = []
for path in sorted(glob.glob(os.path.join(tmp_dir, '*.json'))):
    try:
        with open(path) as f:
            benchmarks.append(json.load(f))
    except Exception:
        pass

data = {
    'benchmarks': benchmarks,
    'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
}
with open(out_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f"=== Results written to {out_file} ===")
print(f"=== Summary: {len(benchmarks)} / {int(sys.argv[3]) if len(sys.argv) > 3 else '?'} benchmarks completed ===")
for b in benchmarks[:5]:
    fn = b['function']
    ts = b['tsb']['mean_ms']
    py = b['pandas']['mean_ms']
    ratio = b['ratio']
    faster = 'tsb' if ratio < 1 else 'pandas'
    print(f"  {fn}: tsb={ts:.2f}ms, pandas={py:.2f}ms, ratio={ratio}x ({faster} faster)")
if len(benchmarks) > 5:
    print(f"  ... and {len(benchmarks) - 5} more")
PYEOF
