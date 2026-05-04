# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-05-04T12:51:00Z |
| Iteration Count | 34 |
| Best Metric | 21.048 |
| Target Metric | — |
| Metric Direction | lower |
| Branch | autoloop/tsb-perf-evolve |
| PR | #262 |
| Issue | #189 |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, pending-ci, accepted, rejected |

## 🧬 Population

### c034 · island 3 · fitness pending CI · gen 34

- **Op**: exploitation; **Cell**: aos-typed-array · non-comparison; **Parent**: c029 (best, fitness 21.048)
- **Approach**: Merge histogram accumulation inline into init loop (eliminating separate O(n) AoS re-scan) + si stride counter in scatter loop (avoids i*3 multiply) + RangeIndex fast path in gather phase (skip 100k bounds-checked at() calls). Commit a9065e9.
- **Status**: ⏳ pending CI

### ~~c033~~ superseded by c034 (same core approach + RangeIndex fast path, correctly placed on branch)

### ~~c032~~ (commit a9daa8b not found on branch; superseded by c033 same approach)

### ~~c031~~ (commit e99cc8d not found on branch; superseded)

### ~~c030~~ (CI action_required; pre-computed histogram approach adopted in c032)

### c029 · island 3 · fitness 21.048 · gen 29

- **Approach**: AoS scatter; all 3 writes/element on same cache line. Commit 150c0be.
- **Status**: ✅ accepted CI 25183916807 — tsb=112.50ms / pandas=5.34ms

### ~~c028~~ fitness 21.841 · ~~c027~~ rejected · ~~c022~~ merged PR #226 (LSD 8-pass radix) · ~~c003~~ island 1 fitness 27.999

## 📚 Lessons Learned

- LSD radix (8-pass, IEEE-754 transform) eliminates comparator callbacks; bottleneck at n=100k.
- Module-level TypedArray buffers eliminate GC; grow lazily, never shrink.
- Even pass count (8) → result in srcBuf after all passes (no final copy needed).
- Benchmark noise: pandas time varies (~4-5.5ms); need ≥10% tsb speedup to clear noise.
- AoS scatter packs all 3 writes/element on same cache line; SoA is worse for writes.
- Merging histogram accumulation into init loop saves one O(n) pass over _rxA (eliminates separate re-scan of AoS buffer).
- `index.take(perm)` calls at() with bounds-check for each element; RangeIndex fast path saves this.
- Accumulated stride counter (si += 3) avoids one multiply per scatter element; may help JIT.

## 🚧 Foreclosed Avenues

- Island 0 (boxed {v,i}): high GC at n=100k.
- BigInt64 packed sort: ~5-10x slower.

## 🔭 Future Directions

- 4-pass 16-bit radix (half passes, 256KB histogram; may hurt L1 cache hit rate).
- Island 4 hybrid: Array.prototype.sort for n < 1k, radix for n ≥ 1k.

## 📊 Iteration History

### Iteration 34 — 2026-05-04 12:51 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25319882149)

- **Status**: ⏳ pending CI · c034 · exploitation · island 3
- **Operator**: exploitation · **Parent**: c029 (fitness 21.048)
- **Change**: Merge histogram accumulation into init loop + accumulated si stride counter + RangeIndex fast path for index.take(perm). Commit a9065e9 (pushed via safeoutputs).
- **Metric**: pending CI (best: 21.048)

### Iteration 33 — 2026-05-03 18:35 UTC — [Run](https://github.com/githubnext/tsessebe/actions/runs/25287191173)

- **Status**: ⏳ pending CI · c033 · exploitation · island 3 (commit lost from branch)
- **Change**: Merge histogram accumulation into init loop. Same as c034 approach.

### Iters 30–32 — ⏳ pending CI / lost commits · exploitation · island 3 · pre-compute/merge histogram approaches.

### Iteration 29 — 2026-04-30 18:44 UTC

- **Status**: ✅ Accepted fitness=21.048; merged PR #255
- **Change**: AoS scatter layout.

### Iteration 28 — 2026-04-30 01:08 UTC

- **Status**: ✅ Accepted fitness=21.841; merged PR #249
- **Change**: Merge partition+radix-init into one pass.

### Iters 1–27 — c022 ✅ merged PR #226 (LSD 8-pass radix, fitness ~29→21). c027 ❌ fitness=29.573.
