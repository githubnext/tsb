# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-01T01:37:17Z |
| Iteration Count | 337 |
| Best Metric | 152 |
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
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, accepted |

## 🎯 Current Priorities

- Next: `pd.read_feather` / `to_feather` (Apache Arrow feather format) or more offsets (BusinessHour, CustomBusinessDay, etc.)

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. `df.col(name)` to get column.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`.
- **exactOptionalPropertyTypes**: Explicit `if (field !== null/undefined) opts.field = field` pattern for optional fields.
- **Binary I/O**: Magic header + version + nRows/nCols + column headers (name, tag) + data with validity bitmaps.

## 🔭 Future Directions

- `pd.read_feather` / `to_feather` (Apache Arrow feather format)
- More date offsets (BusinessHour, CustomBusinessDay, etc.)

## 📊 Iteration History

### Iters 336–337 — ✅ (151→152): readOrc/toOrc (TSB ORC v1 binary I/O), fiscal date offsets (QuarterEnd/Begin, BusinessMonthEnd/Begin, FY5253, FY5253Quarter).

### Iters 334–335 — ✅ (151→153): readParquet/toParquet (Apache Parquet v2), readPickle/toPickle (TSB Pickle v1), Easter DateOffset.

### Iters 1–333 — ✅ (0→151): Full pandas core, stats, io, merge, reshape, window, groupby, string ops, datetime, offsets, period, interval, multi-index, grouper, lreshape, readXml/toXml, readTable, case_when, feather, offsets_extended, and more.

