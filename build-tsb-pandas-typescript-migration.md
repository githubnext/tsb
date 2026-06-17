# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-17T00:00:00Z |
| Iteration Count | 361 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted |

---

## 🎯 Current Priorities

- More io: parquet (custom binary), HDF5, Excel (openpyxl-free)

---

## 📚 Lessons Learned

- **CI/TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`. `import type`. `Error classes` → `src/errors.ts`. `exactOptionalPropertyTypes`. `Index.size`. `Series.iat(i)`. `import type { Index }`.
- **Metric**: counts `src/**/*.ts` (not index) with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`. `df.index` = `Index<Label>`.
- **IO**: SQL adapter pattern. Binary I/O: `BinReader`/`BinWriter`; patch map offsets post-write. `Label[]` ⊂ `Scalar[]`.
- **Stata**: DTA v118 XML-tagged format. 14×uint64 map; patch after all sections. Missing sentinels by type. `new Array<T>(n).fill(v)` avoids `as` cast.
- **Parquet**: Thrift binary protocol (big-endian I16/I32/I64). PLAIN encoding little-endian. RLE levels: 4-byte LE prefix + varint-run data (v1) or no prefix (v2). `buf[i] ?? 0` for magic byte checks. `(out[idx] ?? 0) | bit` for boolean encoding. Remove unused imports strictly.
- **Arrow/Feather**: Flatbuffer backward-building builder: writes toward lower address; vtable after soffset at lower address; `soffset = tablePos - vtablePos` (positive). Arrow IPC file: `ARROW1` + 2-pad + schema msg + recordbatch msg + footer + footer_len(i32LE) + `ARROW1`. FieldNode={length:i64,null_count:i64}; Buffer={offset:i64,length:i64}; Block={offset:i64,metaLen:i32,[4pad],bodyLen:i64} (24 bytes). Empty validity bitmap = no nulls. `Label[]` not assignable from `Scalar[]` without coercion; use `toLabel()` helper.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 🔭 Future Directions

- `src/io/parquet.ts` (retry — previous iter was pending-ci, branch rebased)
- `src/io/read_excel.ts` additions / openpyxl-free path

---

## 📊 Iteration History

### Iteration 361 — 2026-06-17 00:00 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27676481076)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/feather.ts` — readFeather()/toFeather() Apache Arrow IPC (Feather v2) I/O; pure-TypeScript FlatbufferBuilder/Reader; int8/16/32/64, uint8/16/32/64, float32/64, bool, Utf8, Timestamp, Null types; validity bitmaps; indexCol/usecols/nRows/writeIndex options.
- **Metric**: 156 (prev: 155, delta: +1); commit eb3b17a

### Iters 316–360 — ✅/⏳ (148→156): lreshape, sql, flags, readXml, readTable, caseWhen, stata, parquet (pending-ci).

### Iters 1–315 — ✅ (0→148): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index.


