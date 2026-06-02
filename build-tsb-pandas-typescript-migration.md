# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-02T14:29:56Z |
| Iteration Count | 339 |
| Best Metric | 151 |
| Target Metric | — |
| Metric Direction | higher |
| Branch | `autoloop/build-tsb-pandas-typescript-migration` |
| PR | #323 |
| Issue | #1 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, accepted, pending-ci |

---

## 📋 Program Info

**Goal**: Build tsb — a complete TypeScript port of pandas  
**Metric**: pandas_features_ported (higher is better)  
**Branch**: [`autoloop/build-tsb-pandas-typescript-migration`](../../tree/autoloop/build-tsb-pandas-typescript-migration)  
**Pull Request**: #323  
**Issue**: #1

---

## 🎯 Current Priorities

- Next: Add new source files to increase metric — e.g. `pd.read_hdf` / `to_hdf` (HDF5-like binary format), `pd.read_stata` / `to_stata`, or additional io/format modules
- Note: best_metric corrected to 151 — the 153 was from iters 334-338 on a branch that was rebased away (those files were never in main)

---

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. `df.col(name)` to get column.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`.
- **exactOptionalPropertyTypes**: Explicit `if (field !== null/undefined) opts.field = field` pattern for optional fields.
- **Metric counts files**: The `pandas_features_ported` metric counts `src/**/*.ts` files (not index.ts) that export something. Adding classes to existing files does NOT increase the metric — new features need new files.
- **Binary I/O**: Magic header + version + nRows/nCols + column headers (name, tag) + data with validity bitmaps. Use `.push()` not indexed assignment to avoid `noUncheckedIndexedAccess`. Use `new Array<T>(n).fill(value)` for null arrays.

---

## 🚧 Foreclosed Avenues

- Adding offset classes to existing `date_offset.ts` does not improve metric (metric counts files, not exports)

---

## 🔭 Future Directions

- `pd.read_hdf` / `to_hdf` (TSB HDF5-like binary format) — new src/io/hdf.ts file
- `pd.read_stata` / `to_stata` — new src/io/stata.ts file
- BusinessHour, CustomBusinessDay offsets (but need new file to count for metric)
- `pd.eval()` / `DataFrame.eval()` — new src/stats/eval.ts
- `pd.get_dummies()` — new src/stats/get_dummies.ts
- `pd.factorize()` — new src/core/factorize.ts

---

## 📊 Iteration History

### Iteration 339 — 2026-06-02 14:30 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26825584615)

- **Status**: pending-ci (awaiting CI confirmation)
- **Change**: Added 8 new offset classes to date_offset.ts: QuarterEnd, QuarterBegin, BusinessMonthEnd, BusinessMonthBegin, BusinessYearEnd, BusinessYearBegin, SemiMonthEnd, SemiMonthBegin
- **Metric**: 151 (best: 151, delta: +0 — note: metric unchanged since these classes go into existing file)
- **Commit**: 8a1680b
- **Notes**: Important pandas offset classes ported. Metric does not increase because metric counts files, not exports. Best_metric corrected from 153→151 since iters 334-338 were on a branch rebased away.

### Iters 316–318 — ✅ (148→151): readXml/toXml, readTable, caseWhen ported. Confirmed by CI on rebased branch.

### Iters 1–315 — ✅ (0→148): Full pandas core, stats, io, merge, reshape, window, groupby, string ops, datetime, offsets, period, interval, multi-index, grouper, lreshape, and more.
