# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-16T09:14:26Z |
| Iteration Count | 359 |
| Best Metric | 155 |
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
| Recent Statuses | pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, pending-ci, pending-ci |

---

## 🎯 Current Priorities

- More io: parquet (custom binary), feather format

---

## 📚 Lessons Learned

- **CI/TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `import type`. `Error classes` → `src/errors.ts`. `exactOptionalPropertyTypes`. `Index.size`. `Series.iat(i)`. `import type { Index }`.
- **Metric**: counts `src/**/*.ts` (not index) with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`. `df.index` = `Index<Label>`.
- **IO**: SQL adapter pattern. Binary I/O: `BinReader`/`BinWriter`; patch map offsets post-write. `Label[]` ⊂ `Scalar[]`.
- **Stata**: DTA v118 XML-tagged format. 14×uint64 map; patch after all sections. Missing sentinels by type. `new Array<T>(n).fill(v)` avoids `as` cast.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 🔭 Future Directions

- `src/io/parquet.ts`, `src/io/feather.ts`

---

## 📊 Iteration History

### Iteration 359 — 2026-06-16 09:14 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27605513395)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/stata.ts` — readStata()/toStata() Stata DTA binary I/O, v114/115/117/118/119 reading, v118 writing, missing values, string/bool/numeric columns, value labels, indexCol/nRows/usecols options.
- **Metric**: 155 (prev: 154, delta: +1); commit ca5d18b

### Iteration 358 — 2026-06-15 20:04 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27572746284)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/reshape/lreshape.ts` — lreshape() wide-to-long with named groups, dropna, tests, playground.
- **Metric**: 154 (prev: 153, delta: +1); commit 316658a

### Iters 316–358 — ✅/⏳ (148→154): lreshape, sql, flags, readXml, readTable, caseWhen.

### Iters 1–315 — ✅ (0→148): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index.

