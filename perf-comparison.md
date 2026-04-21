# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-21T14:17:00Z |
| Iteration Count | 277 |
| Best Metric | 382 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #166 |
| Steering Issue | #131 |
| Experiment Log | #130 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, error, error, accepted, accepted, error, error, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)
**Pull Request**: #166
**Steering Issue**: #131

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Iter 277 (canonical 382)**: Fixed Series constructor (142 files), import paths, cummax/cummin standalone, DataFrame.fromColumns, plus installed pandas + added Python-based parallel runner with process-group kill. Result: 382/508 pairs. Commit b95658d pushed to PR #166.
- **Pandas must be installed**: Previous runs got 2-11/508 because pandas wasn't installed. Always install pandas before running benchmarks.
- **subprocess.TimeoutExpired doesn't kill grandchildren**: Use `start_new_session=True` + `os.killpg(os.getpgid(proc.pid), SIGKILL)` to kill all tsx/esbuild children.
- **Import paths**: Use `../../src/index.ts` not `"tsb"` — the tsb package may not be installed in runner environments.
- **Series constructor**: Use `new Series({ data: [...] })` — passing an array directly fails with tsx/node.
- **Balanced-paren fix needed**: The Series constructor fix requires balanced-paren parsing (not regex) — `Array.from({ length: N }, (_, i) => i)` has nested parens.
- **Standalone functions vs methods**: cummax/cummin/cumprod/cumsum are standalone functions. Call as `cummax(series)` not `series.cummax()`.
- **DataFrame construction**: use `DataFrame.fromColumns({...})` not `new DataFrame({...})`.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.

---

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Old sequential approach is too slow for 508 pairs. Use parallel Python runner.
- **SSH push**: SSH to github.com is blocked in this runner environment.
- **HTTPS push without credentials**: git credential helper not configured; git push hangs waiting for input. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- **Fix remaining 126 failing pairs** (382/508 passing):
  1. Benchmarks calling unimplemented methods (df.abs, s.clip, s.between, s.combineFirst, df.astype) — rewrite to use existing API or skip
  2. Slow benchmarks timing out (concat_axis1, dataframe_expanding rolling variants) — reduce dataset size or iterations
  3. Python benchmark issues (wrong pandas API)

---

## 📊 Iteration History

### Iteration 277 — 2026-04-21T14:17 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24722137337)

- **Status**: ✅ Accepted
- **Change**: Fix benchmark constructors (Series/DataFrame), import paths, cummax/cummin standalone; add parallel Python runner with process-group kill; install pandas
- **Metric**: 382 (previous best: 0 canonical, delta: +382)
- **Commit**: b95658d
- **Notes**: Huge improvement from 0→382. Root causes were: pandas not installed (2→11 pairs), wrong Series/DataFrame constructors (142 files), wrong import paths (42 files).

### Iters 269–276 — ⚠️ error/wrong-branch | metrics 233-312 but all on suffixed branches or local-only, canonical was 0.

### Iters 258–268 — ✅ mix (wrong branches) | metrics claimed 604→610 but canonical was always 0.

### Iters 252–257 — ✅/⚠️ mix | metrics 534→543.

### Iters 163–251 — ✅/⚠️ mix | metrics 508→534. PR #148 merged 534 pairs to main.

### Iters 1–162 — all ✅/⚠️ | metrics 0→508. Full baseline benchmarks established.
