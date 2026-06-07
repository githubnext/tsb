# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-06-07T01:34:53Z |
| Iteration Count | 345 |
| Best Metric | 678 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #328 |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted, accepted |

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
- **Python docstring escaping**: Python benchmark files with escaped quotes (`\"\"\"`) instead of real triple-quotes will fail `py_compile` and block the entire evaluation. Fix any such files immediately.

## 🚧 Foreclosed Avenues

- Branch suffixes, sequential run_benchmarks.sh, SSH/HTTPS push.

---

## 🔭 Future Directions

- Option-variant benchmarks (axis/limit/method parameters)
- Period.contains / Period.diff variants not yet benchmarked (now covered in period_arithmetic)
- Styler.format / Styler.apply / Styler.applymap not yet benchmarked as standalone

---

## 📊 Iteration History

### Iteration 345 — 2026-06-07T01:34:53Z — [Run](https://github.com/githubnext/tsb/actions/runs/27079290567)

- **Status**: ✅ Accepted
- **Change**: Added 3 benchmark pairs: `pd_options` (getOption/setOption/resetOption/describeOption/optionContext), `styler_extended` (barChart/highlightBetween/highlightNull/toHtml/toLatex), `dataframe_at_iat` (dataFrameAt/dataFrameIat scalar access); fixed docstring escaping in bench_str_extract_all.py and bench_str_extract_groups.py; rebased branch onto origin/main
- **Metric**: 678 (previous best: 677, delta: +1)
- **Commit**: 9571018
- **Notes**: Branch rebased from iter 342 onto origin/main. Iters 343-344 content re-added (styler_extended, dataframe_at_iat) plus new pd_options pair.

### Iters 342–344 — ✅ | 675→677: to_json_denormalize, cut_bins_to_frame, dataframe_at_iat, styler_extended.

### Iters 321–341 — ✅ | 665→674: readHtml, options_ops, to_json_denormalize, pd_api, elem_ops, clip_with_bounds, format_table, numeric_extended, join/joinAll/crossJoin, sort_ops, cut_bins, resample, merge_ordered, na_ops, rename_ops, math_ops, value_counts, notna_boolean, window_extended, abs_round, autocorr, extensions, window_indexers, pd_errors.

### Iters 1–320 — ✅ | Metrics 0→665: Built out full benchmark suite.
