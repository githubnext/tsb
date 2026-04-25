# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T14:32:00Z |
| Iteration Count | 292 |
| Best Metric | 653 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — (pending CI) |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | error, error, accepted, accepted, error, error, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better)
**Branch**: [`autoloop/perf-comparison`](../../tree/autoloop/perf-comparison)

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: `../../src/index.ts`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **Standalones**: cummax/cummin/cumprod/cumsum/diff/explode/pct_change/seriesAbs/where/mask/sample/replace/astype/pivot.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: mergeAsof(left, right, { on: "key", direction: "backward"|"forward"|"nearest" }) — DFs must be sorted.
- **crossJoin**: crossJoin(left, right) — small DFs only (100×100 safe).
- **string_accessor**: available as `series.str.lower()`, `.strip()`, `.len()`, `.replace(pat, repl)`, `.split(sep)`.
- **insert_pop**: exported as `insertColumn(df, loc, col, values)` and `popColumn(df, col)`.
- **natsort**: exported as `natSorted(arr)` from src/index.ts.

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Never commit to `autoloop/perf-comparison-{suffix}` branches. Only `autoloop/perf-comparison` counts.
- **Sequential run_benchmarks.sh**: Too slow for 500+ pairs. Use parallel Python runner.
- **SSH push** and **HTTPS push without credentials**: blocked. Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- Continue adding option-variant benchmarks (axis/limit/method parameters)
- Check for new src/ modules added to tsb library
- More string_accessor variants: startswith, endswith, findall, extract

---

## 📊 Iteration History

### Iters 289–292 — ✅ | Metrics 638→653 (+5 each). New pairs: xs_dataframe/series, at_iat, series_apply_fn, merge_asof/ordered, crossjoin, resample, styler, swap_level, auto_corr, string_accessor, insert_pop, natsort, truncate, update, filter_labels, window_extended, squeeze_ops, corr_with, add_prefix_suffix, infer_convert_dtypes, dot_matmul.

### Iters 1–288 — ✅/⚠️ | Metrics 0→653. See git history for details.
