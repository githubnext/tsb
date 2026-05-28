# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-28T14:08:55Z |
| Iteration Count | 333 |
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
- `datetime_tz` ✅ now covered
- `resample_apply` (custom agg fn) — ✅ now covered (`resample_agg`)
- `FixedForwardWindowIndexer` with rolling (custom indexer + rolling.sum) not yet benchmarked
- Period.contains / Period.diff variants not yet benchmarked
- `registerExtensionDtype` / `ExtensionDtype` abstract subclassing not yet benchmarked

---

## 📊 Iteration History

### Iteration 333 — 2026-05-28T14:08:55Z — [Run](https://github.com/githubnext/tsb/actions/runs/26579823379)

- **Status**: ✅ Accepted
- **Change**: Added 5 benchmark pairs: `add_sub_mul_div` (seriesAdd/Sub/Mul/Div + dataFrameAdd/Sub), `pow_mod` (seriesPow/Mod/FloorDiv + dataFramePow/Mod/FloorDiv), `shift_diff` (shiftSeries/diffSeries/dataFrameShift/Diff), `numeric_extended` (zscore/minMaxNormalize/digitize/histogram), `categorical_ops` (catSortByFreq/catFreqTable/catRecode)
- **Metric**: 678 (previous best: 673 on branch, delta: +5)
- **Commit**: 64def2e
- **Notes**: State file iters 331/332 were not committed to branch (commits missing); actual branch baseline was 673. Added 5 new module-level pairs covering arithmetic, numeric normalization, and categorical ops.

### Iters 321–332 — ✅ | 665→673: readHtml (321), phantom/restore (322–328), merge_ordered/resample/options/join/notna/window/na/reduce/rename/math/value_counts (327–330), resample_dataframe/agg/ohlc/period_todatetime/extensions_register (331), datetime_tz/to_json/at_iat/elem_ops/sort_ops/series_table_format (332; note: commits for 331–332 not found on branch, actual branch metric was 673).

### Iters 1–320 — ✅ | Metrics 0→665: Built out full benchmark suite.
