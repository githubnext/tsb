import pandas as pd, time, json
N = 50_000
cats1 = ["A", "B", "C", "D"]
cats2 = ["C", "D", "E", "F"]
s1 = pd.Categorical([cats1[i % len(cats1)] for i in range(N)], categories=cats1)
s2 = pd.Categorical([cats2[i % len(cats2)] for i in range(N)], categories=cats2)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    _ = s1.set_categories(s1.categories.union(s2.categories))
    _ = s1.set_categories(s1.categories.intersection(s2.categories))
    _ = s1.set_categories(s1.categories.difference(s2.categories))
t0 = time.perf_counter()
for _ in range(ITERS):
    _ = s1.set_categories(s1.categories.union(s2.categories))
    _ = s1.set_categories(s1.categories.intersection(s2.categories))
    _ = s1.set_categories(s1.categories.difference(s2.categories))
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "cat_union_intersect_diff", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
