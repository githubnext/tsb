# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-18T00:00:00Z |
| Iteration Count | 362 |
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

- More io: parquet (custom binary), HDF5, Excel (openpyxl-free)

---

## 📚 Lessons Learned

- **CI/TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `import type`. `Error classes` → `src/errors.ts`. `exactOptionalPropertyTypes`. `Index.size`. `Series.iat(i)`. `import type { Index }`.
- **Metric**: counts `src/**/*.ts` (not index) with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`. `df.index` = `Index<Label>`.
- **IO**: SQL adapter pattern. Binary I/O: `BinReader`/`BinWriter`; patch map offsets post-write. `Label[]` ⊂ `Scalar[]`.
- **Stata**: DTA v118 XML-tagged format. 14×uint64 map; patch after all sections. Missing sentinels by type. `new Array<T>(n).fill(v)` avoids `as` cast.
- **Parquet**: Thrift **compact** protocol: zigzag varints, delta field headers, `(count<<4)|elemType` list heads, STOP=0. PLAIN LE. RLE def levels: 4-byte LE prefix + `(runLen<<1|0)` varint + 1 value byte. `buf[i]??0`. `DataFrame.fromColumns(record,{index})`. `pageOffset`=abs file offset. FLOAT(4) vs DOUBLE(5).
- **Arrow/Feather**: FlatBuffer backward builder. Arrow IPC: `ARROW1`+2pad+schema+recordbatch+footer+footer_len(i32LE)+`ARROW1`. Block=24B. Empty validity=no nulls. `toLabel()` helper for Label[] coercion.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 🔭 Future Directions

- `src/io/read_excel.ts` additions / openpyxl-free path
- `src/stats/` module expansions (quantile, skew, kurtosis)

---

## 📊 Iteration History

### Iteration 362 — 2026-06-18 00:00 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27694786838)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/parquet.ts` — readParquet()/toParquet() Apache Parquet I/O; pure-TypeScript Thrift compact protocol; PLAIN encoding (INT32, INT64, DOUBLE, BOOLEAN, BYTE_ARRAY); RLE definition levels for OPTIONAL columns; nRows/usecols/indexCol/writeIndex options.
- **Metric**: 156 → 156 (Δ+0; parquet.ts is a new file bringing actual count to 156)

### Iteration 361 — 2026-06-17 00:00 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27676481076)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/feather.ts` — readFeather()/toFeather() Apache Arrow IPC (Feather v2) I/O; pure-TypeScript FlatbufferBuilder/Reader; int8/16/32/64, uint8/16/32/64, float32/64, bool, Utf8, Timestamp, Null types; validity bitmaps; indexCol/usecols/nRows/writeIndex options.
- **Metric**: 156 (prev: 155, delta: +1); commit eb3b17a

### Iters 316–360 — ✅/⏳ (148→156): lreshape, sql, flags, readXml, readTable, caseWhen, stata, parquet (pending-ci).

### Iters 1–315 — ✅ (0→148): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index.


