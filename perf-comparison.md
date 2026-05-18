# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-18T19:26:22Z |
| Iteration Count | 321 |
| Best Metric | 666 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | #324 |
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
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: #324

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
- `notna_boolean`, `add_sub_mul_div` (named series arithmetic) still uncovered

---

## 📊 Iteration History

### Iteration 321 — 2026-05-18T19:26:22Z — [Run](https://github.com/githubnext/tsb/actions/runs/26055399596)

- **Status**: ✅ Accepted
- **Change**: Added `readHtml` benchmark pair — 1,000-row HTML table parsed 20 iterations by both tsb `readHtml` and `pd.read_html`; uses lxml backend for pandas
- **Metric**: 666 (previous best: 665, delta: +1) · **Commit**: ce991ce
- **Notes**: `src/io/read_html.ts` was exported but had no benchmark. Python uses `pd.read_html` with auto-installed lxml backend.

### Iteration 320 — 2026-05-18T01:34:10Z — [Run](https://github.com/githubnext/tsb/actions/runs/26008813008)

- **Status**: ✅ Accepted
- **Change**: Added `toDictOriented` / `fromDictOriented` benchmark pair — 10k-row DataFrame, all orient variants (list, records, split, index, tight) plus `from_dict` with columns and index orients
- **Metric**: 665 (previous best: 664, delta: +1) · **Commit**: 7851cfb
- **Notes**: `to_from_dict.ts` exports were previously unbenchmarked. Python uses `df.to_dict(orient=...)` and `pd.DataFrame.from_dict(...)` for matching coverage.

### Iteration 319 — 2026-05-17T07:46:03Z — [Run](https://github.com/githubnext/tsb/actions/runs/25984977778)

- **Status**: ✅ Accepted
- **Change**: Added `pdArray`/`PandasArray` benchmark pair — 10k-element arrays of int, float, string, and nullable int types; tests creation, `.at()`, `.toArray()`, `.length`
- **Metric**: 664 (previous best: 663, delta: +1) · **Commit**: 2d75133
- **Notes**: `pdArray` and `PandasArray` (from `src/core/pd_array.ts`) had no benchmark coverage. Python equivalent uses `pd.array()` with nullable dtypes (`Int64`, `Float64`, `string`).

### Iters 317–318 — ✅ | 662→663: `pipe` pair; `timedelta_range`+`combine` pairs.

### Iters 1–316 — ✅ | Metrics 0→661: Built out full benchmark suite across all tsb modules (Series, DataFrame, GroupBy, merge, reshape, window, stats, io, string/datetime accessors, categorical, etc.).
