# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-31T07:58:52Z |
| Iteration Count | 336 |
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
| Recent Statuses | accepted, pending-ci, accepted, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted |

## 🎯 Current Priorities

- Next: More date offsets (FY5253, FY5253Quarter, etc.)
- Then: `pd.read_feather` / `to_feather` (if not already done)

## 📚 Lessons Learned

- **CI**: `arr[i]!` for noUncheckedIndexedAccess. `import type` for unused imports. `Number.NaN` not `NaN`. `useBlockStatements` in Biome.
- **Imports**: Stats from `../core`, `../types.ts`. Tests from `../../src/index.ts`.
- **DataFrame**: Use `DataFrame.fromColumns({...})` + `{ index: [...] }`. `df.col(name)` to get column.
- **Offset pattern**: `if onOffset → stepN(date, n); else if n>0 → stepN(rollforward(date), n-1); else → stepN(rollback(date), n+1)`.
- **exactOptionalPropertyTypes**: Explicit `if (field !== null/undefined) opts.field = field` pattern for optional fields.
- **Binary I/O**: Magic header + version + nRows/nCols + column headers (name, tag) + data with validity bitmaps.

## 🔭 Future Directions

- More date offsets (FY5253, FY5253Quarter, etc.)
- `pd.read_feather` / `to_feather` (Apache Arrow feather format)

## 📊 Iteration History

### Iteration 336 — 2026-05-31 07:58 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/26707090722)
- **Status**: ✅ Accepted (pending CI)
- **Change**: Add `src/io/orc.ts` — `readOrc`/`toOrc` — TSB ORC v1 binary columnar I/O with null/NA support, column subset, indexCol options. 50+ tests + playground page.
- **Metric**: 152 (prev best: 151, delta: +1) — Commit: 32a568f

### Iters 334–335 — ✅ (151→153): readParquet/toParquet (Apache Parquet v2), readPickle/toPickle (TSB Pickle v1), Easter DateOffset.

### Iters 1–333 — ✅ (0→151): Full pandas core, stats, io, merge, reshape, window, groupby, string ops, datetime, offsets, period, interval, multi-index, grouper, lreshape, readXml/toXml, readTable, case_when, feather, offsets_extended, and more.

