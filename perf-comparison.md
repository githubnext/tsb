# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-21T01:31:30Z |
| Iteration Count | 324 |
| Best Metric | 667 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #328 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: #328

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: Always `../../src/index.js` (not `.ts`) for all benchmark files.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: `mergeAsof(left, right, { on, direction })` — DFs must be sorted.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series per column.
- **bun in sandbox**: `bun` may not be available in the sandbox — TS validation is skipped locally; CI gate on GitHub Actions validates TS benchmarks.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- More string_accessor variants: startswith, endswith
- Option-variant benchmarks (axis/limit/method parameters)
- `datetime_tz` variants still uncovered
- `notna_boolean` src/stats/notna_boolean.ts — still needs benchmark
- `add_sub_mul_div` src/stats/add_sub_mul_div.ts — still needs benchmark

---

## 📊 Iteration History

### Iteration 324 — 2026-05-21T01:31:30Z — [Run](https://github.com/githubnext/tsb/actions/runs/26200018415)

- **Status**: ✅ Accepted
- **Change**: Added `to_json_normalize` benchmark pair — 10k-row DataFrame serialized via `toJsonDenormalize`, `toJsonRecords`, `toJsonSplit`; Python uses `df.to_dict(orient=records/split/index)`
- **Metric**: 667 (previous best: 666, delta: +1) · **Commit**: e1b2869
- **Notes**: Corrected state (phantom iters 322–323 had no commits on branch). `src/io/to_json_normalize.ts` write functions were unbenchmarked.

### Iters 321–323 — ✅ | 665→666: `readHtml` pair (iter 321 committed). Iters 322–323 recorded in state but commits not found on branch (phantom).

### Iters 1–320 — ✅ | Metrics 0→665: Built out full benchmark suite across all tsb modules (Series, DataFrame, GroupBy, merge, reshape, window, stats, io, string/datetime accessors, categorical, etc.).
