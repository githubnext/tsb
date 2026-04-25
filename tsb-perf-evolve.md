# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T05:47:00Z |
| Iteration Count | 13 |
| Best Metric | 27.999 |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | pending CI |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, not-pushed, not-pushed, pending, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci |

## 🧬 Population

### c014 · island 3 · fitness pending CI · gen 13

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · non-comparison
- **Parent**: c003 (island 1, fitness 27.999)
- **Approach**: LSD 8-pass radix sort on IEEE-754 bit-transformed uint32 key pairs. Module-level _rxSrc/_rxDst/_rxKeyHi/_rxKeyLo ping-pong buffers; _rxCnt 256-bucket histogram. Uint32Array overlay on fvals.buffer for raw bits. Zero JS comparator callbacks. Descending by reverse-iterate. String/mixed fallback unchanged. Commit 5440d62.
- **Status**: ⏳ pending CI — commit 5440d62

### ~~c013~~ · phantom · gen 12 — same radix design; commit 1affdf2 not found in remote (previous phantom)

### c011 · island 3 · ~~phantom~~ · gen 10 — same radix design, never pushed (d25a8b5 lost on fast-forward)

### ~~c010~~ · phantom · gen 9 — same radix design; commit b2c8640 was on a pre-merge branch, never landed in main

### ~~c008,c007,c006,c005,c004~~ · (phantom: commits written but never pushed) · gens 3-7

### c003 · island 1 · fitness 27.999 · gen 2

- **Feature cell**: parallel-typed-arrays · comparison
- **Approach**: NaN pre-partition + Float64Array fvals; `fvals[a]!-fvals[b]!` comparator
- **Status**: ✅ accepted — CI run 24843983915; tsb=155.63ms / pandas=5.56ms

### ~~c002~~ · ❌ TS2538 · gen 1

## 📚 Lessons Learned

- `noUncheckedIndexedAccess`: TypedArray[i]=number|undefined; use `!`.
- Callback overhead is bottleneck at n=100k: ~1.6M calls × 100ns = 160ms.
- `new Uint32Array(fvals.buffer)` is valid TypeScript; no `as` needed.
- Island 3 (LSD radix sort): 8-pass on IEEE-754 transformed keys eliminates callbacks.
- After even number of ping-pong swaps, src arrays hold final result.
- `arr[i]!++` invalid in strict TS; use `const v=arr[i]!; arr[i]=v+1;`.
- **Patch size fix**: Remote branch stale vs main → fast-forward branch to origin/main before making change. PR diff = only sortValues change (120+/-30 lines).

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.
- Inline introsort (c005): never materialized; callback overhead likely still present with this approach.

## 🔭 Future Directions

- If radix sort (c010) succeeds: exploit — also make finBuf/nanBuf module-level to eliminate remaining per-call allocations.
- If radix sort fails: try Island 4 (hybrid: small-input Array.sort, large-input radix).

## 📊 Iteration History

### Iteration 13 — 2026-04-25 05:47 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24923827970)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · **Candidate**: c014
- **Change**: LSD 8-pass radix sort; Uint32Array key pairs from fvals.buffer; module-level ping-pong buffers; no comparator callbacks; fast-forwarded branch to main before commit to fix patch size
- **Commit**: 5440d62 · **Metric**: pending CI
- **Notes**: Branch fast-forwarded to origin/main first; diff vs main = sortValues only (150 lines).

### Iters 9–12 — 2026-04-24–25 — ❌ phantoms — island 3 LSD radix; same radix design re-tried, commits never reached remote

### Iters 1–4 — 2026-04-23
- Iter 2: ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); PR #206 merged
- Iter 1: ❌ TS2538; human-fixed
