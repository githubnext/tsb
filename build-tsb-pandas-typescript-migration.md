# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-20T08:22:53Z |
| Iteration Count | 367 |
| Best Metric | 158 |
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
| Recent Statuses | accepted, pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted |

---

## 🎯 Current Priorities

- More io: HDF5 (read_hdf/to_hdf) — next target; to_excel ✅ done, read_fwf ✅ done

---

## 📚 Lessons Learned

- **CI/TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`; `str.charAt(i)` not `str[i]`. `import type`. Error classes → `src/errors.ts`. `exactOptionalPropertyTypes`. `Index.size`. `Series.iat(i)`.
- **Biome/TS conflict**: Biome `noConfusingVoidType` bans `boolean | void` unions; TypeScript won't accept `boolean | undefined` for callbacks that return void. Fix: use `void` as sole return type (not union) and remove early-exit logic.
- **Metric**: counts `src/**/*.ts` (not index) with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`.
- **IO**: SQL adapter pattern. Binary I/O: `BinReader`/`BinWriter`; patch map offsets post-write. `Label[]` ⊂ `Scalar[]`.
- **Parquet**: Thrift compact: zigzag varints, delta field headers, `(count<<4)|elemType` list heads. PLAIN LE. RLE def levels: 4-byte LE prefix. FLOAT(4) vs DOUBLE(5).
- **Arrow/Feather**: FlatBuffer backward builder. Arrow IPC: `ARROW1`+2pad+schema+recordbatch+footer+i32LE+`ARROW1`. Empty validity=no nulls.
- **Stata**: DTA v118 XML-tagged. 14×uint64 map; patch after all sections. Missing sentinels by type.
- **XLSX/ZIP**: CRC32 pure-TS; `deflateRawSync` from `node:zlib` (biome-ignore lint/correctness/noNodejsModules). OOXML = 7 XML parts; worksheet path always `sheet1.xml` (readExcel resolves via rId1 in workbook.xml.rels). SST for strings/non-finite; numeric/bool cells direct. `noUncheckedIndexedAccess`: `?? 0` on all array reads.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 🔭 Future Directions

- HDF5 (`read_hdf`/`to_hdf`) — next major IO format; significant effort required (custom HDF5 parser)
- `src/stats/` module expansions

---

## 📊 Iteration History

### Iteration 367 — 2026-06-20 08:22 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27865008837)
- **Status**: ✅ accepted
- **Change**: Add `src/io/to_excel.ts` — `toExcel()` mirroring `pandas.DataFrame.to_excel()`; pure-TS CRC32+ZIP writer (DEFLATE via node:zlib), OOXML (7 XML parts), SST, all scalar types, index/header/naRep/columns/startRow/startCol options. Commit 853611b.
- **Metric**: 157 → 158 (Δ+1)

### Iters 316–366 — ✅/⏳ (148→157): fwf, to_excel (iter 365 didn't land), feather, parquet, stata, xml, readTable, caseWhen, flags, sql, lreshape.

### Iters 1–315 — ✅ (0→148): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index.


