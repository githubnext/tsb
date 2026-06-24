# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-24T13:33:38Z |
| Iteration Count | 371 |
| Best Metric | 702 |
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

- **Import paths**: Always `../../src/index.ts` (not `.js`).
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: `mergeAsof(left, right, { on, direction })` — DFs must be sorted.
- **corrWith**: `corrWith(df, seriesOther)` — DF as first arg, returns Series per column.
- **Python docstrings**: Use real triple-quotes (escaped quotes fail py_compile).
- **bun build**: `node:zlib` lacks `inflateRawSync`; bench_read_excel must be self-contained.
- **Resample frequencies**: Use "H", "D", "MS", "QS", "YS" — NOT "1h".
- **Series constructor**: `new Series({ data: Array.from(arr), index: idx })`. DataFrame.fromColumns index: `{ index: idx }`.
- **Bun unavailable in sandbox**: Evaluation returns null; acceptance based on file count.
- **crossJoin/joinAll**: Columns must not overlap unless lsuffix/rsuffix. `joinAll(left, others[], options?)`.
- **Python VariableOffsetWindowIndexer**: Use custom `BaseIndexer` subclass (tsb uses integer offsets).
- **Baseline**: Iter 363 = first real commit at 675 pairs.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)
- join/crossJoin with overlapping columns using suffixes

---

## 📊 Iteration History

### Iteration 371 — 2026-06-24 13:33 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28102222569)
- **Status**: ✅ Accepted
- **Change**: Add 3 pairs: series_setaxis_toframe (seriesToFrame/setAxisSeries/setAxisDataFrame/addPrefixSeries/addSuffixSeries), item_bool_extract (itemSeries/boolSeries/boolDataFrame), option_context (describeOption/optionContext enter+exit).
- **Metric**: 702 (previous best: 699, delta: +3)

### Iters 363–370 — ✅ (675→699): 363: merge_asof/cross_join/join_all; 364: shift_diff/sort_ops/pow_mod; 365: at_iat/filter_series/truncate_df; 366: convert_dtypes/series_format_table/str_findall_expand; 367: numeric_ops_log2_exp/dataframe_transform_named/series_compare_pair; 368: get_set_option/xs_series/dataframe_update; 369: series_to_markdown/dataframe_compare_pair/resample_dataframe; 370: autocorr/window_indexers/series_dot_dataframe.
