# Autoloop: build-tsb-pandas-typescript-migration

🤖 *Maintained by the Autoloop agent.*

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-06-19T19:58:35Z |
| Iteration Count | 366 |
| Best Metric | 157 |
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
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, accepted, pending-ci, accepted, accepted, pending-ci, accepted, pending-ci |

---

## 🎯 Current Priorities

- More io: HDF5 (read_hdf/to_hdf), read_fwf ✅ done, to_excel ✅ done

---

## 📚 Lessons Learned

- **CI/TS**: `noUncheckedIndexedAccess` → `arr[i] ?? fallback`; `str.charAt(i)` not `str[i]`. `import type`. Error classes → `src/errors.ts`. `exactOptionalPropertyTypes`. `Index.size`. `Series.iat(i)`.
- **Biome/TS conflict**: Biome `noConfusingVoidType` bans `boolean | void` unions; TypeScript won't accept `boolean | undefined` for callbacks that return void. Fix: use `void` as sole return type (not union) and remove early-exit logic.
- **Metric**: counts `src/**/*.ts` (not index) with exports. `df.col(name)`. `df.columns.values` = `readonly string[]`.
- **IO**: SQL adapter pattern. Binary I/O: `BinReader`/`BinWriter`; patch map offsets post-write. `Label[]` ⊂ `Scalar[]`.
- **Parquet**: Thrift compact: zigzag varints, delta field headers, `(count<<4)|elemType` list heads. PLAIN LE. RLE def levels: 4-byte LE prefix. FLOAT(4) vs DOUBLE(5).
- **Arrow/Feather**: FlatBuffer backward builder. Arrow IPC: `ARROW1`+2pad+schema+recordbatch+footer+i32LE+`ARROW1`. Empty validity=no nulls.
- **Stata**: DTA v118 XML-tagged. 14×uint64 map; patch after all sections. Missing sentinels by type.
- **FWF**: `readFwf` — column inference: position is separator if `charAt` returns `""` or `" "` in ALL sample rows.

---

## 🚧 Foreclosed Avenues

- Offset classes added to existing file: no metric gain

---

## 🔭 Future Directions

- HDF5 (`read_hdf`/`to_hdf`) — next major IO format
- `src/stats/` module expansions

---

## 📊 Iteration History

### Iteration 366 — 2026-06-19 19:58 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27844317021)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/fwf.ts` — `readFwf()` mirroring `pandas.read_fwf()`; auto-infers column widths from whitespace gaps, supports `colspecs`/`widths`, `header`, `names`, `indexCol`, `dtype`, `naValues`, `skipRows`, `nRows`, `inferNrows`. Also fixes `parquet.ts` TS2345: readStruct handler type changed to `() => void` to satisfy both TypeScript and Biome (avoids `noConfusingVoidType` union).
- **Metric**: 156 → 157 (Δ+1); commits 13cb227 + 740c141

### Iteration 365 — 2026-06-19 08:40 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27815130329)
- **Status**: ⏳ pending-ci
- **Change**: Add `src/io/to_excel.ts` — `toExcel()` mirroring `pandas.DataFrame.to_excel()`; pure-TS ZIP+DEFLATE writer, shared string table, numeric/bool/string cells, index option, sheetName, naRep. Playground to_excel.html.
- **Metric**: 156 → 157 (Δ+1); commit cfdc094

### Iteration 364 — 2026-06-18 19:38 UTC — [Run](https://github.com/githubnext/tsb/actions/runs/27784523734)
- **Status**: ⏳ pending-ci (commit e198ae9 not confirmed on branch)
- **Change**: Attempted read_fwf.ts — not landed on branch; superseded by iter 365.
- **Metric**: 156 (unchanged)

### Iters 316–363 — ✅/⏳ (148→156): feather, parquet, stata, xml, readTable, caseWhen, flags, sql, lreshape.

### Iters 1–315 — ✅ (0→148): Core, stats, io, merge, reshape, window, groupby, datetime, multi-index.


