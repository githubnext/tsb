# Evergreen — PR #369

**PR**: Add Rust/WASM acceleration coverage for core functions  
**Branch**: `goal/349-goal-add-rust-wasm-acceleration-coverage-for-core-functions`  
**Labels**: automation, goal, evergreen

## Run History

### Run 1 (series.ts radix sort `?? 0` fix)
- Fixed `noUncheckedIndexedAccess` errors in radix sort path in `series.ts`
- Added `?? 0` fallbacks for typed array indexed access

### Run 2 (series.ts lint + biome format fixes)
- CI failure: `bun run lint` → biome check "Found 3 errors. Found 780 warnings."
- Root cause: commit `bc4c7a7` (feat: wasm acceleration) added format violations
- Fixed `wasm-coverage.json`: added missing trailing newline (EOF)
- Fixed `src/wasm/accelerated.ts` lines 250, 422, 548: refactored long (>100 char)
  lines in `medianF64Accelerated`, `expandingMeanF64Accelerated`, `rollingFallback`
  - Line 250: extracted `midVal`/`lo` with `?? Number.NaN` (removed `as` casts)
  - Line 422: extracted `meanFn` variable to shorten return statement
  - Line 548: simplified filter to `!Number.isNaN(v)` (removed redundant null checks)
- Fixed `src/core/series.ts` `isIndexLike()`: `rec["size"]` → `rec.size` etc. (useLiteralKeys)
- Pushed commit `f330ebd` to PR branch; CI triggered

## Key Notes
- biome.json ignores: `benchmarks/**`, `scripts/**`, `rust/**`, `*.d.ts`
- biome counts 1 format error per file (not per line)
- "Found 3 errors" = likely 1 (wasm-coverage.json) + 1 (accelerated.ts) + 1 unknown
  → if CI still shows errors after run 2, check `src/wasm/loader.ts`, `src/io/xml.ts`
- All long lines in `series.ts` (875, 876, 1446) are pre-existing (on main), not new
- `tests/io/read_excel.test.ts` long lines are pre-existing string literals (biome can't break them)
