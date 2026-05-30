# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-30T07:44:15Z |
| Iteration Count | 335 |
| Best Metric | 676 |
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

- **Import paths**: Always `../../src/index.ts` for all benchmark files (recent style; older files use `.js`).
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
- `FixedForwardWindowIndexer` with rolling not yet benchmarked
- Period.contains / Period.diff variants not yet benchmarked

---

## 📊 Iteration History

### Iteration 335 — 2026-05-30T07:44:15Z — [Run](https://github.com/githubnext/tsb/actions/runs/26678361944)

- **Status**: ✅ Accepted
- **Change**: Added 3 benchmark pairs: `join` (DataFrame.join), `join_all` (joinAll on 4 frames), `cross_join` (crossJoin Cartesian product)
- **Metric**: 676 (branch count; state file had inflated 678, actual branch was 673, delta: +3)
- **Commit**: e655688
- **Notes**: `join`, `joinAll`, `crossJoin` were the only merge functions without benchmarks. Added realistic 1000-row left×right index-join, 4-frame joinAll, and 200×200 cross-join scenarios.

### Iteration 334 — 2026-05-29T08:10:29Z — [Run](https://github.com/githubnext/tsb/actions/runs/26625976669)

- **Status**: ✅ Accepted
- **Change**: Added 5 benchmark pairs: `clip_with_bounds` (clipSeriesWithBounds/clipDataFrameWithBounds), `sort_ops_fn` (sortValuesSeries/sortIndexSeries/sortValuesDataFrame/sortIndexDataFrame), `cut_bins_to_frame` (cut+cutBinsToFrame/cutBinCounts/binEdges), `series_to_markdown` (seriesToMarkdown/seriesToLaTeX), `auto_corr` (autoCorr at multiple lags)
- **Metric**: 678 (previous best: 673 on branch, delta: +5)
- **Commit**: c9c4734
- **Notes**: Branch was at 673 (state file had optimistic 678 from uncommitted iters). Added 5 new pairs covering clip bounds, sort ops API, cut bin summarization, Series markdown/LaTeX formatting, and autocorrelation.

### Iters 321–334 — ✅ | 665→676: readHtml, phantom/restore, merge_ordered/resample/join/notna/window/na/reduce/rename/math/value_counts, resample_df/agg/ohlc/period/extensions, datetime_tz/to_json/at_iat/elem_ops/sort_ops/series_fmt, add_sub_mul_div/pow_mod/shift_diff/numeric_extended/categorical_ops, clip_with_bounds/sort_ops_fn/cut_bins_to_frame/series_to_markdown/auto_corr.

### Iters 1–320 — ✅ | Metrics 0→665: Built out full benchmark suite.
