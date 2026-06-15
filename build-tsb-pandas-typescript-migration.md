# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-15T08:48:12Z |
| Iteration Count | 357 |
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
| Recent Statuses | pending-ci, pending-ci, accepted, accepted, pending-ci, accepted, pending-ci, pending-ci, pending-ci, pending-ci |

---

## 🎯 Current Priorities

- More io: parquet (custom binary), feather format
- `src/io/stata.ts` — read_stata/to_stata (DTA format)
- `src/reshape/lreshape.ts` — pd.lreshape() (wide→long reshape)

---

## 📚 Lessons Learned

- **CI**: `arr[i]!` noUncheckedIndexedAccess. `import type`. `Number.NaN`. `useBlockStatements`. `for...of`. Error classes → `src/errors.ts` (avoid duplicate exports).
- **Strict TS**: No `as`. `exactOptionalPropertyTypes`: guard before assign. `Index.size` not `.length`. `Index(Label[])` — filter with `(v): v is Label`. `Series.iat(i)` positional, `.at(label)` label.
- **Metric/Imports**: counts `src/**/*.ts` (not index) with exports. Stats/types from `../core`/`../types.ts`. Tests from `../../src/index.ts`. `df.col(name)`. `df.columns.values` is `readonly string[]`.
- **IO patterns**: HDF/TSH: magic `TSH\x01`, dtype codes, null bitmap. Interchange: float nulls→NaN; int/str→byte mask. SQL: `SqlConnection` adapter; error classes exported as values (not `export type`). `SqlValue` separate from `Scalar`.
- **Flags/WeakMap**: structural `IndexLike { values: readonly unknown[] }` avoids `as` casts + circular imports. `import type { Flags }` in frame/series. `getFlags(this)` returns wrapper each call, all share WeakMap state.
- **State pending-ci**: Many iterations end pending-ci (push deferred to workflow end). On iter 356 confirmed branch metric was 151 before flags.ts.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain (counts files not exports)

---

## 🔭 Future Directions

- More io: parquet (custom binary), feather format
- `src/io/stata.ts` — read_stata/to_stata (DTA format)
- `src/reshape/lreshape.ts` — pd.lreshape() (wide→long reshape)

---

## 📊 Iteration History

### Iteration 357 — 2026-06-15 08:48 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27534707847)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/sql.ts` — SQL I/O: `readSql`, `readSqlQuery`, `readSqlTable`, `toSql`, `SqlConnection` adapter interface, `TableExistsError`, `TableNotFoundError`.
- **Metric**: 153 (previous best: 152, delta: +1); commit 8c94a0e

### Iteration 356 — 2026-06-14 13:21 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27500141426)
- **Status**: ✅ Accepted
- **Change**: Add `src/core/flags.ts` — `Flags` class, WeakMap registry, `allowsDuplicateLabels`, `DuplicateLabelError` in errors.ts, `flags` getter on DataFrame + Series. Synced branch with main.
- **Metric**: 152 (previous confirmed: 151, delta: +1); commit 68aa59c

### Iters 316–355 — ✅/⏳ (148→151): readXml, readTable, caseWhen; many pending-CI iterations did not land on branch.

### Iters 1–315 — ✅ (0→148): Full pandas core, stats, io, merge, reshape, window, groupby, datetime, offsets, period, interval, multi-index, and more.

