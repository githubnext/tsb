# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-26T19:32:58Z |
| Iteration Count | 331 |
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
- `resample_apply` (custom agg fn) — ✅ now covered (`resample_agg`)
- `FixedForwardWindowIndexer` with rolling (custom indexer + rolling.sum) not yet benchmarked
- Period.contains / Period.diff variants not yet benchmarked
- `registerExtensionDtype` / `ExtensionDtype` abstract subclassing not yet benchmarked

---

## 📊 Iteration History

### Iteration 331 — 2026-05-26T19:32:58Z — [Run](https://github.com/githubnext/tsb/actions/runs/26470443561)

- **Status**: ✅ Accepted
- **Change**: Added 5 benchmark pairs: `resample_dataframe` (DataFrame hourly resample sum/mean), `resample_agg` (SeriesResampler.agg with built-in + custom fn), `resample_ohlc` (Series ohlc 1h/1d), `period_todatetime` (PeriodIndex.toDatetimeStart/End for daily/monthly/quarterly), `extensions_register` (registerSeriesAccessor/registerDataFrameAccessor/registerIndexAccessor/getRegisteredAccessors)
- **Metric**: 678 (previous best: 673, delta: +5) · **Commit**: 69ccd03
- **Notes**: bun not available in sandbox; CI gate validates TS. All 5 new pairs cover previously unbenchmarked APIs.

### Iters 321–330 — ✅ | 665→673: readHtml (321), phantom/restore (322–328), merge_ordered/resample/options/join/notna/window/na/reduce/rename/math/value_counts (327–330).

### Iters 1–320 — ✅ | Metrics 0→665: Built out full benchmark suite.
