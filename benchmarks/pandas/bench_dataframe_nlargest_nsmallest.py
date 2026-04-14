import pandas as pd, time, json
N = 100_000
df = pd.DataFrame({
    "a": [(i * 1337) % 100_007 for i in range(N)],
    "b": [(i * 7919) % 100_003 for i in range(N)],
    "c": [(i * 3571) % 99_991 for i in range(N)],
})
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    df.nlargest(100, "a")
    df.nsmallest(100, "a")
t0 = time.perf_counter()
for _ in range(ITERS):
    df.nlargest(100, "a")
    df.nsmallest(100, "a")
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "dataframe_nlargest_nsmallest", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
