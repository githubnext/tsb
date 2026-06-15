# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-15T20:04:40Z |
| Iteration Count | 358 |
| Best Metric | 154 |
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
| Recent Statuses | pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, pending-ci, pending-ci, pending-ci |

---

## 🎯 Current Priorities

- More io: parquet (custom binary), feather format
- `src/io/stata.ts` — read_stata/to_stata (DTA format)

---

## 📚 Lessons Learned

- **CI**: `arr[i]! as T` noUncheckedIndexedAccess. `import type`. `Number.NaN`. `useBlockStatements`. `for...of`. Error classes → `src/errors.ts`.
- **Strict TS**: `exactOptionalPropertyTypes` guard before assign. `Index.size` not `.length`. `Series.iat(i)` positional. `import type { Index }` (type-only).
- **Metric**: counts `src/**/*.ts` (not index) with exports. `df.col(name)`. `df.columns.values` is `readonly string[]`.
- **IO**: SQL: `SqlConnection` adapter; error classes exported as values. `SqlValue` separate from `Scalar`.
- **lreshape**: use `totalRows` counter (not outLabels); `for (let vi=0;...)` for parallel array access.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 🔭 Future Directions

- `src/io/stata.ts`, `src/io/parquet.ts`, `src/io/feather.ts`

---

## 📊 Iteration History

### Iteration 358 — 2026-06-15 20:04 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27572746284)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/reshape/lreshape.ts` — lreshape() wide-to-long with named groups, dropna, tests, playground.
- **Metric**: 154 (prev: 153, delta: +1); commit 316658a

### Iters 316–357 — ✅/⏳ (148→153): sql.ts, flags.ts, readXml, readTable, caseWhen; many pending-CI iterations.

### Iters 1–315 — ✅ (0→148): Full pandas core, stats, io, merge, reshape, window, groupby, datetime, offsets, period, interval, multi-index, and more.

