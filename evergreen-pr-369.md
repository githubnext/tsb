# Evergreen Run — PR #369

**Branch:** `goal/349-goal-add-rust-wasm-acceleration-coverage-for-core-functions`
**Last run:** 2026-07-06
**Status:** Changes pushed — awaiting CI

## Commit pushed (this run)

```
b4e2585 fix: resolve noUncheckedIndexedAccess errors in series.ts radix sort
```

## Changes made

### src/core/series.ts
Radix sort implementation had ~28 typed array (Uint32Array) element accesses
returning `number | undefined` under `noUncheckedIndexedAccess`. Previous
evergreen had removed `!` operators (Biome noNonNullAssertion) which broke tsc.
Fix: use `?? 0` default value to satisfy both rules.

Specific fixes:
- `fvalsU32[fsi]` → `fvalsU32[fsi] ?? 0` (lo/hi IEEE-754 bit reads)
- `_rxHisto[idx] = (_rxHisto[idx] ?? 0) + 1` (8 histogram update lines)
- `_rxHisto[base + b] ?? 0` (prefix sum computation)
- `(srcBuf[si + keyOff] ?? 0)` (radix pass bucket computation)
- `_rxHisto[histoBase + bucket] ?? 0` (radix pass write position)
- `srcBuf[si] ?? 0`, `srcBuf[si+1] ?? 0`, `srcBuf[si+2] ?? 0` (4 reconstruction loops × 3 reads)
- `dstBuf[di] = srcBuf[si] ?? 0` etc. (radix pass copy)

## CI failures targeted
- `Test & Lint` — tsc --noEmit: ~25 TypeScript errors in radix sort section of series.ts
