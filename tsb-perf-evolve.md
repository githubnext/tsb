# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-25T00:51:37Z |
| Iteration Count | 11 |
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
| Recent Statuses | accepted, not-pushed, not-pushed, pending, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci |

## 🧬 Population

### c012 · island 3 · fitness pending CI · gen 11

- **Operator**: exploration; **Feature cell**: parallel-typed-arrays · non-comparison
- **Parent**: c003 (island 1, fitness 27.999)
- **Approach**: LSD 8-pass radix sort on IEEE-754 bit-transformed float64 keys. Module-level _rxA/_rxB/_rxKL/_rxKH ping-pong buffers (module-level _rxCnt). `new Uint32Array(fvals.buffer)` for raw bits. Zero JS comparator callbacks. Descending by reverse iteration. String/mixed fallback unchanged. Uses `pos = pos + 1` pattern throughout. Commit 2c2d728.
- **Status**: ⏳ pending CI — commit 2c2d728

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
- c003 fitness=27.999: tsb=155.63ms vs pandas=5.56ms. ~1.6M JS callback calls in Uint32Array.sort(callback) at ~100ns/call ≈ 160ms. Callback overhead IS the bottleneck.
- `Uint32Array(_rfSlot.buffer)` gives two-element view of Float64Array bits — valid TypeScript, no `as` casts needed.
- Island 3 (LSD radix sort): 8-pass O(8n) counting sort on IEEE-754 transformed keys eliminates all JS comparator callbacks.
- After an even number of double-buffer swaps, the primary arrays hold the final sorted data.
- PR #206 was merged and branch was fast-forwarded; on next iteration, branch must be checked out from origin/main before committing new changes.
- `arr[i]!++` is INVALID in strict TypeScript (non-null assertion produces rvalue, not lvalue). Use `const v = arr[i]!; arr[i] = v + 1;` pattern instead.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.
- Inline introsort (c005): never materialized; callback overhead likely still present with this approach.

## 🔭 Future Directions

- If radix sort (c010) succeeds: exploit — also make finBuf/nanBuf module-level to eliminate remaining per-call allocations.
- If radix sort fails: try Island 4 (hybrid: small-input Array.sort, large-input radix).

## 📊 Iteration History

### Iteration 11 — 2026-04-25 00:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/24918488164)

- **Status**: ⏳ pending CI · **Op**: exploration · **Island**: 3 · **Candidate**: c012
- **Change**: LSD 8-pass radix sort; IEEE-754 transform; module-level ping-pong buffers; descend by reverse iteration; uses `pos = pos + 1` to avoid strict TS rvalue issues
- **Commit**: 2c2d728 · **Metric**: pending CI
- **Notes**: c011 was a phantom (d25a8b5 never landed); c012 is a clean re-implementation pushed to branch successfully.

### Iteration 10 — 2026-04-24 22:55 UTC — ❌ phantom (c011 commit d25a8b5 never landed; fast-forwarded away)

### Iters 5–9 — 2026-04-24 — ❌ phantoms — exploration island 3; LSD radix sort attempts, commits never pushed

### Iters 1–4 — 2026-04-23
- Iter 2: ✅ c003 fitness=27.999 (tsb=155.63ms, pandas=5.56ms); PR #206 merged
- Iter 1: ❌ TS2538; human-fixed
