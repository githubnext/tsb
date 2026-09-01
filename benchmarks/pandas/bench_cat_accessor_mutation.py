import json
import time
import pandas as pd

N = 50_000
CATS = ["alpha", "beta", "gamma", "delta", "epsilon"]
data = [CATS[i % len(CATS)] for i in range(N)]
series = pd.Series(pd.Categorical(data, categories=CATS))

WARMUP = 5
ITERATIONS = 50


def run():
    # remove_categories — remove an absent category (safe no-op)
    series.cat.remove_categories([])

    # rename_categories — rename via dict
    series.cat.rename_categories(
        {"alpha": "a", "beta": "b", "gamma": "c", "delta": "d", "epsilon": "e"}
    )

    # set_categories — replace with a superset
    series.cat.set_categories(
        ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"], ordered=False
    )

    # reorder_categories — same set, different order
    series.cat.reorder_categories(["epsilon", "delta", "gamma", "beta", "alpha"])

    # as_ordered / as_unordered — flip ordered flag
    series.cat.as_ordered()
    series.cat.as_unordered()


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "cat_accessor_mutation",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
