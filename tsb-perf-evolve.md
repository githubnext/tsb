# Autoloop: tsb-perf-evolve

## ⚙️ Machine State

| Field | Value |
|-------|-------|
| Last Run | 2026-04-23T03:52:41Z |
| Iteration Count | 1 |
| Best Metric | — (pending CI) |
| Target Metric | — |
| Branch | autoloop/tsb-perf-evolve |
| PR | — |
| Issue | #aw_progissue |
| Paused | false |
| Pause Reason | — |
| Completed | false |
| Completed Reason | — |
| Consecutive Errors | 0 |
| Recent Statuses | pending-ci |

## 📚 Lessons Learned

- Sandbox has no bun — CI is validation gate.
- Original creates N boxed {v,i} objects + 2 map() calls — high GC at n=100k.
- NaN pre-partition removes NaN branch from comparator hot path.

## 🚧 Foreclosed Avenues

none yet

## 🔭 Future Directions

- Island 2: Pack (value,index) into BigInt64Array for single-buffer sort.
- Island 3: Radix sort for finite floats (Float64 to uint transform, LSD radix).
- Island 4: Hybrid small-input boxed / large-input typed-array dispatch.

## 🧬 Population

### c001 island 1 fitness pending-ci gen 1

- Operator: exploration (first run)
- Feature cell: parallel-typed-arrays / comparison
- Approach: NaN pre-partition to Uint32Array; indirect index sort; single gather loop.
- Status: pending CI — commit 24bbe85

## 📊 Iteration History

### Iter 1 2026-04-23T03:52:41Z Run https://github.com/githubnext/tsessebe/actions/runs/24815695413

- Status: Pending CI, exploration, Island 1
- Change: Replace boxed {v,i} pair sort with indirect Uint32Array index sort + NaN pre-partition
- Commit: 24bbe85
