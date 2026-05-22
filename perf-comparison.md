# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-22T13:38:45Z |
| Iteration Count | 326 |
| Best Metric | 669 |
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
- `notna_boolean` src/stats/notna_boolean.ts — ✅ benchmarked in iter 326
- `to_json_normalize` (toJsonDenormalize/toJsonRecords/toJsonSplit) — ✅ benchmarked in iter 326
- `window_extended` (rollingSem/rollingSkew/rollingKurt/rollingQuantile) — ✅ benchmarked in iter 326

---

## 📊 Iteration History

### Iteration 326 — 2026-05-22T13:38:45Z — [Run](https://github.com/githubnext/tsb/actions/runs/26291054120)

- **Status**: ✅ Accepted
- **Change**: Added `window_extended`, `notna_boolean`, and `to_json_normalize` benchmark pairs — rolling higher-order stats (sem/skew/kurt/quantile), boolean-mask indexing (keepTrue/keepFalse/filterBy), and JSON denormalize serialization on 100k/10k rows
- **Metric**: 669 (previous best: 668, delta: +1) · **Commit**: 3d4ba02
- **Notes**: Corrected state — iters 322–325 were phantom (commits recorded in state but not on branch). Actual branch count before this iter was 666 pairs. Adding 3 pairs brings count to 669, exceeding the inflated best of 668.

### Iters 324–325 — phantom state entries (commits recorded but not found on branch)

### Iters 321–323 — ✅ | 665→666: `readHtml` pair (iter 321 committed). Iters 322–323 phantom.

### Iters 1–320 — ✅ | Metrics 0→665: Built out full benchmark suite.
