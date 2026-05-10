# Autoloop: perf-comparison

🤖 *This file is maintained by the Autoloop agent. Maintainers may freely edit any section.*

---

## ⚙️ Machine State

> 🤖 *Updated automatically after each iteration. The pre-step scheduler reads this table — keep it accurate.*

| Field | Value |
|-------|-------|
| Last Run | 2026-05-10T01:27:31Z |
| Iteration Count | 308 |
| Best Metric | 656 |
| Target Metric | — |
| Branch | `autoloop/perf-comparison` |
| PR | — |
| Issue | #221 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, error, accepted, error, error, accepted, accepted, accepted, accepted, accepted |

---

## 📋 Program Info

**Goal**: Benchmark every tsb function vs pandas equivalent, one per iteration.
**Metric**: benchmarked_functions (higher is better) · **Issue**: #221 · **PR**: (new, #265 merged)

---

## 🎯 Current Priorities

*(No specific priorities set — agent is exploring freely.)*

---

## 📚 Lessons Learned

- **Import paths**: `../../src/index.ts`. Series: `new Series({ data: [...] })`. DF: `DataFrame.fromColumns({...})`.
- **groupby AggName**: "sum"|"mean"|"min"|"max"|"count"|"std"|"first"|"last"|"size" only.
- **merge_asof**: mergeAsof(left, right, { on: "key", direction: "backward"|"forward"|"nearest" }) — DFs must be sorted.
- **crossJoin**: crossJoin(left, right) — small DFs only (100×100 safe).
- **string_accessor**: `series.str.lower()`, `.strip()`, `.len()`, `.replace(pat, repl)`, `.split(sep)`.
- **insert_pop**: `insertColumn(df, loc, col, values)` / `popColumn(df, col)`. **natsort**: `natSorted(arr)`.
- **Styler**: `dataFrameStyle(df).highlightMax().highlightMin().backgroundGradient().exportStyles()`.
- **mergeOrdered**: `mergeOrdered(df1, df2, { on: "key" })`. **keepTrue/keepFalse**: boolean mask on Series.

- **corrWith**: takes a DataFrame as first arg (not two Series); `corrWith(df, seriesOther)` returns a Series of correlation coefficients per column.
- **dot_matmul**: `dataFrameDotDataFrame(left, right)` requires left.columns to match right.index row labels for the inner join.

## 🚧 Foreclosed Avenues

- **Suffixed branches**: Only `autoloop/perf-comparison` (never with suffix).
- **Sequential run_benchmarks.sh**: Too slow for 500+ pairs.
- **SSH/HTTPS push**: Use safeoutputs push_to_pull_request_branch.

---

## 🔭 Future Directions

- More string_accessor variants: startswith, endswith
- Option-variant benchmarks (axis/limit/method parameters)
- `format_ops`, `swaplevel`

---

## 📊 Iteration History

### Iteration 308 — 2026-05-10T01:27:31Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25616542195)

- **Status**: ✅ Accepted
- **Change**: Added 3 benchmark pairs: `window_extended` (rollingSem/rollingSkew/rollingKurt/rollingQuantile), `str_findall` (strFindall/strFindallCount/strFindFirst), `scalar_extract` (squeezeSeries/squeezeDataFrame/firstValidIndex/lastValidIndex).
- **Metric**: 656 (previous best: 655, delta: +1) · **Commit**: a4252cf

### Iteration 307 — 2026-05-09T07:28:52Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25595320643)

- **Status**: ✅ Accepted
- **Change**: Added 2 benchmark pairs: `str_findall` (strFindall/strFindallCount/strFindFirst on strings) and `combine` (combineSeries/combineDataFrame element-wise).
- **Metric**: 655 (previous best: 653, delta: +2) · **Commit**: d283599

### Iteration 306 — 2026-05-05T18:48:00Z — [Run](https://github.com/githubnext/tsessebe/actions/runs/25395459295)

- **Status**: ✅ Accepted
- **Change**: Added 2 benchmark pairs: `replace` (Series + DataFrame scalar replacement) and `cum_ops` (cumsum/cumprod/cummax/cummin for Series and DataFrame).
- **Metric**: 653 (previous best: 651, delta: +2) · **Commit**: 83a9122

### Iters 305–307 — ✅ | Metrics 649→651→653→655: dropna/fillna, replace/cum_ops, str_findall/combine (unmerged).

### Iters 1–304 — ✅/⚠️ | Metrics 0→649. See git history on autoloop/perf-comparison branch.
