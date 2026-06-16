# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-16T19:57:00Z |
| Iteration Count | 360 |
| Best Metric | 156 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, pending-ci |

---

## 🎯 Current Priorities

- More io: parquet (custom binary), feather format

---

## 📚 Lessons Learned

- **CI/TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `import type`. `Error classes` → `src/errors.ts`. `exactOptionalPropertyTypes`. `Index.size`. `Series.iat(i)`. `import type { Index }`.
- **Metric**: counts `src/**/*.ts` (not index) with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`. `df.index` = `Index<Label>`.
- **IO**: SQL adapter pattern. Binary I/O: `BinReader`/`BinWriter`; patch map offsets post-write. `Label[]` ⊂ `Scalar[]`.
- **Stata**: DTA v118 XML-tagged format. 14×uint64 map; patch after all sections. Missing sentinels by type. `new Array<T>(n).fill(v)` avoids `as` cast.
- **Parquet**: Thrift binary protocol (big-endian I16/I32/I64). PLAIN encoding little-endian. RLE levels: 4-byte LE prefix + varint-run data (v1) or no prefix (v2). `buf[i] ?? 0` for magic byte checks. `(out[idx] ?? 0) | bit` for boolean encoding. Remove unused imports strictly.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 🔭 Future Directions

- `src/io/feather.ts`

---

## 📊 Iteration History

### Iteration 360 — 2026-06-16 19:57 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27644165462)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/parquet.ts` — readParquet()/toParquet() Apache Parquet binary I/O; custom Thrift decoder/encoder; RLE level codec; PLAIN encoding for BOOLEAN/INT32/INT64/FLOAT/DOUBLE/BYTE_ARRAY; nullable columns with definition levels; single row group writing, multi-row-group reading; DATA_PAGE v1/v2.
- **Metric**: 156 (prev: 155, delta: +1); commit ab26234

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

