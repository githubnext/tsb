# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-01T20:16:24Z |
| Iteration Count | 338 |
| Best Metric | 153 |
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
| Recent Statuses | accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, accepted, accepted |

## 🎯 Current Priorities

- Next: More date offsets (BusinessHour, CustomBusinessDay, etc.) or `pd.read_hdf` / `to_hdf` (HDF5 format)

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. `df.col(name)` to get column.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`.
- **exactOptionalPropertyTypes**: Explicit `if (field !== null/undefined) opts.field = field` pattern for optional fields.
- **Binary I/O**: Magic header + version + nRows/nCols + column headers (name, tag) + data with validity bitmaps. Use `.push()` not indexed assignment to avoid `noUncheckedIndexedAccess`. Use `new Array<T>(n).fill(value)` for null arrays.

## 🔭 Future Directions

- More date offsets (BusinessHour, CustomBusinessDay, etc.)
- `pd.read_hdf` / `to_hdf` (TSB HDF5-like binary format)
- `pd.read_stata` / `to_stata`

## 📊 Iteration History

### Iters 334–338 — ✅ (151→153): readParquet/toParquet, readPickle/toPickle (Easter DateOffset), readOrc/toOrc (fiscal date offsets), readFeather/toFeather (TSB Feather v1 binary I/O with validity bitmaps).

### Iters 1–333 — ✅ (0→151): Full pandas core, stats, io, merge, reshape, window, groupby, string ops, datetime, offsets, period, interval, multi-index, grouper, lreshape, readXml/toXml, readTable, case_when, feather, offsets_extended, and more.

