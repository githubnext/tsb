# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-25T20:30:00Z |
| Iteration Count | 374 |
| Best Metric | 711 |
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

### Iteration 374 — 2026-06-25 20:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28211440553)
- **Status**: ✅ Accepted
- **Change**: Add 3 pairs: dataframe_itertuples (DataFrame.itertuples() row iteration), series_items_iter (Series.items()/iteritems() pairs), nanprod (nanprod() product ignoring NaN vs pd.Series.prod()).
- **Metric**: 711 (previous best: 708, delta: +3)

### Iteration 373 — 2026-06-25 13:32 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/28173787476)
- **Status**: ✅ Accepted
- **Change**: Add 3 pairs: styler_table_props (setProperties/setTableStyles/setTableAttributes/hide/setPrecision/setNaRep/clearStyles), errors (pd.errors namespace), extensions (ExtensionDtype/ExtensionArray/accessor registration).
- **Metric**: 708 (previous best: 705, delta: +3)

### Iters 363–372 — ✅ (675→705): 363: merge_asof/cross_join/join_all; 364: shift_diff/sort_ops/pow_mod; 365: at_iat/filter_series/truncate_df; 366: convert_dtypes/series_format_table/str_findall_expand; 367: numeric_ops_log2_exp/dataframe_transform_named/series_compare_pair; 368: get_set_option/xs_series/dataframe_update; 369: series_to_markdown/dataframe_compare_pair/resample_dataframe; 370: autocorr/window_indexers/series_dot_dataframe; 371: series_setaxis_toframe/item_bool_extract/option_context; 372: to_latex/styler_format/styler_highlight_adv.
