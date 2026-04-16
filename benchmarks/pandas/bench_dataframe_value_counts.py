import pandas as pd, time, json
N = 100_000
cats = ["apple", "banana", "cherry", "date", "elderberry"]
df = pd.DataFrame({
    "fruit": [cats[i % len(cats)] for i in range(N)],
    "color": ["red" if i % 3 == 0 else "yellow" if i % 3 == 1 else "purple" for i in range(N)],
})
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    df.value_counts(subset=["fruit", "color"])
t0 = time.perf_counter()
for _ in range(ITERS):
    df.value_counts(subset=["fruit", "color"])
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "dataframe_value_counts", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
