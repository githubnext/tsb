"""Generate pandas golden snapshots for TypeScript cross-validation tests.

Run from the repository root:

    python golden/generate.py

The output is deterministic and committed under golden/snapshots/ so TypeScript-only
contributors can run the xval test suite without Python.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Callable

import numpy as np
import pandas as pd
from pandas.api.types import is_datetime64_any_dtype

PANDAS_VERSION = "2.2.3"
NUMPY_VERSION = "2.1.3"
SNAPSHOT_VERSION = 1
ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_DIR = ROOT / "golden" / "snapshots"


def encode_scalar(value: Any) -> Any:
    """Encode pandas/numpy scalars into strict JSON values."""
    if value is pd.NA or value is pd.NaT:
        return {"kind": "NaN"}
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, pd.Timestamp):
        if value.tz is not None:
            return value.isoformat()
        return value.isoformat()
    if isinstance(value, (pd.Interval,)):
        return str(value)
    if isinstance(value, float) and math.isnan(value):
        return {"kind": "NaN"}
    if value is None:
        return {"kind": "NaN"}
    if isinstance(value, (np.datetime64,)):
        if np.isnat(value):
            return {"kind": "NaN"}
        return pd.Timestamp(value).isoformat()
    if isinstance(value, (list, tuple)):
        return [encode_scalar(v) for v in value]
    if isinstance(value, (np.ndarray, pd.Index)):
        return [encode_scalar(v) for v in value.tolist()]
    return value


def encode_label(label: Any) -> Any:
    if isinstance(label, tuple):
        return [encode_scalar(v) for v in label]
    return encode_scalar(label)


def dtype_kind(dtype: Any) -> str:
    text = str(dtype)
    if isinstance(dtype, pd.CategoricalDtype):
        return "category"
    if is_datetime64_any_dtype(dtype):
        return "datetime"
    if text.startswith("int") or text.startswith("uint"):
        return "integer"
    if text.startswith("float"):
        return "float"
    if text == "bool" or text == "boolean":
        return "boolean"
    return "string" if text in {"object", "string"} else text


def index_payload(index: pd.Index) -> dict[str, Any]:
    if isinstance(index, pd.MultiIndex):
        return {
            "kind": "multiindex",
            "names": [name if name is not None else None for name in index.names],
            "dtype": "multiindex",
            "values": [encode_label(v) for v in index.tolist()],
        }
    return {
        "kind": "index",
        "name": index.name if index.name is not None else None,
        "dtype": dtype_kind(index.dtype),
        "values": [encode_label(v) for v in index.tolist()],
    }


def columns_payload(columns: pd.Index) -> dict[str, Any]:
    payload = index_payload(columns)
    if isinstance(columns, pd.MultiIndex):
        payload["names"] = [name if name is not None else None for name in columns.names]
    return payload


def categorical_metadata(obj: pd.Series | pd.DataFrame) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    series_items = obj.items() if isinstance(obj, pd.DataFrame) else [(obj.name or "value", obj)]
    for name, series in series_items:
        if isinstance(series.dtype, pd.CategoricalDtype):
            cat = series.cat
            metadata[str(encode_label(name))] = {
                "categories": [encode_scalar(v) for v in cat.categories.tolist()],
                "codes": [int(v) for v in cat.codes.tolist()],
                "ordered": bool(cat.ordered),
            }
    return metadata


def serialize_result(obj: Any, operation: str) -> dict[str, Any]:
    if isinstance(obj, pd.DataFrame):
        values = [[encode_scalar(v) for v in row] for row in obj.to_numpy(dtype=object).tolist()]
        dtypes = {str(encode_label(col)): dtype_kind(dtype) for col, dtype in obj.dtypes.items()}
        return {
            "kind": "dataframe",
            "operation": operation,
            "shape": [int(obj.shape[0]), int(obj.shape[1])],
            "index": index_payload(obj.index),
            "columns": columns_payload(obj.columns),
            "dtypes": dtypes,
            "data": values,
            "categoricals": categorical_metadata(obj),
        }
    if isinstance(obj, pd.Series):
        return {
            "kind": "series",
            "operation": operation,
            "shape": [int(obj.shape[0])],
            "name": encode_label(obj.name),
            "index": index_payload(obj.index),
            "dtype": dtype_kind(obj.dtype),
            "data": [encode_scalar(v) for v in obj.to_numpy(dtype=object).tolist()],
            "categoricals": categorical_metadata(obj),
        }
    return {"kind": "scalar", "operation": operation, "dtype": dtype_kind(pd.Series([obj]).dtype), "value": encode_scalar(obj)}


class ScenarioRecorder:
    def __init__(self, scenario_id: str, title: str) -> None:
        self.scenario_id = scenario_id
        self.title = title
        self.steps: list[dict[str, Any]] = []

    def step(self, number: int, operation: str, obj: Any) -> Any:
        self.steps.append({"step": number, **serialize_result(obj, operation)})
        return obj

    def snapshot(self) -> dict[str, Any]:
        return {
            "snapshotVersion": SNAPSHOT_VERSION,
            "scenario": self.scenario_id,
            "title": self.title,
            "pandasVersion": pd.__version__,
            "numpyVersion": np.__version__,
            "steps": self.steps,
        }


def scenario_1() -> dict[str, Any]:
    r = ScenarioRecorder("scenario_1", "Multi-source merge with aggregation pipeline")
    sales = pd.DataFrame({
        "date": pd.to_datetime(["2024-01-15", "2024-01-15", "2024-02-20", "2024-02-20", "2024-03-10", "2024-03-10", "2024-01-15", "2024-02-20"]),
        "store": ["NYC", "LA", "NYC", "LA", "NYC", "LA", "NYC", "NYC"],
        "product": ["A", "A", "B", "B", "A", "B", "B", "A"],
        "quantity": [10, 15, 8, 12, 20, 5, 3, 7],
        "unit_price": [9.99, 9.99, 24.50, 24.50, 9.99, 24.50, 24.50, 9.99],
    })
    r.step(1, "verify sales DataFrame", sales)
    sales["revenue"] = sales["quantity"] * sales["unit_price"]
    r.step(2, "verify revenue column added", sales)
    inventory = pd.DataFrame({"store": ["NYC", "NYC", "LA", "LA"], "product": ["A", "B", "A", "B"], "stock": [100, 50, 80, 60], "reorder_point": [20, 10, 15, 12]})
    returns = pd.DataFrame({"date": pd.to_datetime(["2024-01-20", "2024-02-25"]), "store": ["NYC", "LA"], "product": ["A", "B"], "returned_qty": [2, 3]})
    merged = sales.merge(inventory, on=["store", "product"], how="left")
    r.step(3, "verify left merge result", merged)
    merged = merged.merge(returns, on=["date", "store", "product"], how="left")
    merged["returned_qty"] = merged["returned_qty"].fillna(0)
    merged["net_quantity"] = merged["quantity"] - merged["returned_qty"]
    merged["net_revenue"] = merged["net_quantity"] * merged["unit_price"]
    r.step(4, "verify second merge + computed columns", merged)
    summary = merged.groupby(["store", "product"]).agg(total_qty=("net_quantity", "sum"), total_revenue=("net_revenue", "sum"), avg_price=("unit_price", "mean"), num_transactions=("net_quantity", "count"), max_single_sale=("quantity", "max"), stock_remaining=("stock", "first")).reset_index()
    r.step(5, "verify grouped aggregation", summary)
    summary["revenue_per_unit"] = summary["total_revenue"] / summary["total_qty"]
    summary["stock_coverage_days"] = (summary["stock_remaining"] / (summary["total_qty"] / 90)).round(1)
    summary["needs_reorder"] = summary["stock_remaining"] < summary.groupby("store")["stock_remaining"].transform("mean")
    r.step(6, "verify derived metrics", summary)
    result = summary.sort_values(["store", "total_revenue"], ascending=[True, False])
    r.step(7, "verify final sorted output", result)
    return r.snapshot()


def scenario_2() -> dict[str, Any]:
    r = ScenarioRecorder("scenario_2", "Time-series resampling with rolling windows and timezone handling")
    np.random.seed(42)
    idx = pd.date_range("2024-01-01", periods=365, freq="h", tz="US/Eastern")
    sensor = pd.DataFrame({"temperature": np.random.normal(20, 5, 365) + np.sin(np.arange(365) * 2 * np.pi / 24) * 10, "humidity": np.random.uniform(30, 90, 365), "pressure": np.random.normal(1013, 5, 365)}, index=idx[:365])
    r.step(1, "verify base sensor data", sensor)
    sensor.iloc[10:15, 0] = np.nan
    sensor.iloc[50:53, 1] = np.nan
    sensor.iloc[100, :] = np.nan
    r.step(2, "verify NaN injection", sensor)
    filled = sensor.copy()
    filled["temperature"] = filled["temperature"].interpolate(method="linear", limit=3)
    filled["humidity"] = filled["humidity"].ffill(limit=2)
    filled["pressure"] = filled["pressure"].fillna(filled["pressure"].mean())
    r.step(3, "verify mixed fill strategies", filled)
    daily = filled.resample("D").agg({"temperature": ["mean", "min", "max", "std"], "humidity": "mean", "pressure": ["mean", "median"]})
    daily.columns = ["_".join(col).strip("_") for col in daily.columns]
    r.step(4, "verify daily resampling with multi-agg + column flattening", daily)
    daily["temp_rolling_7d"] = daily["temperature_mean"].rolling(7, min_periods=3).mean()
    daily["temp_expanding_max"] = daily["temperature_max"].expanding().max()
    daily["humidity_ewm"] = daily["humidity_mean"].ewm(span=5).mean()
    r.step(5, "verify rolling, expanding, ewm windows", daily)
    daily["temp_zscore"] = (daily["temperature_mean"] - daily["temperature_mean"].mean()) / daily["temperature_mean"].std()
    daily["is_anomaly"] = daily["temp_zscore"].abs() > 2
    anomaly_count = daily["is_anomaly"].sum()
    r.step(6, f"verify z-score anomaly detection (anomaly_count={anomaly_count})", daily)
    utc = daily.tz_convert("UTC")
    tokyo = daily.tz_convert("Asia/Tokyo")
    r.step(7, "verify timezone conversion to UTC", utc)
    r.step(8, "verify timezone conversion to Asia/Tokyo", tokyo)
    return r.snapshot()


def scenario_3() -> dict[str, Any]:
    r = ScenarioRecorder("scenario_3", "Reshaping with MultiIndex gymnastics")
    raw = pd.DataFrame({"student": ["Alice", "Alice", "Alice", "Alice", "Bob", "Bob", "Bob", "Bob", "Carol", "Carol", "Carol", "Carol"], "subject": ["Math", "Science", "Math", "Science", "Math", "Science", "Math", "Science", "Math", "Science", "Math", "Science"], "semester": ["Fall", "Fall", "Spring", "Spring"] * 3, "score": [92, 88, 95, 91, 78, 85, 82, 79, 96, 93, 98, 95], "max_possible": [100] * 12})
    raw["pct"] = (raw["score"] / raw["max_possible"] * 100).round(2)
    r.step(1, "verify percentage computation", raw)
    pivoted = raw.pivot_table(index="student", columns=["subject", "semester"], values=["score", "pct"], aggfunc="mean")
    r.step(2, "verify pivot_table creates correct MultiIndex columns", pivoted)
    stacked = pivoted.stack(level="semester", future_stack=True)
    r.step(3, "verify stack moves semester to row index", stacked)
    unstacked = stacked.unstack(level="student")
    r.step(4, "verify unstack moves student back to columns", unstacked)
    melted = pd.melt(raw, id_vars=["student", "subject", "semester"], value_vars=["score", "pct"], var_name="metric", value_name="value")
    r.step(5, "verify melt produces long format", melted)
    repivoted = melted.pivot_table(index=["student", "semester"], columns=["subject", "metric"], values="value", aggfunc="first")
    r.step(6, "verify round-trip reshape", repivoted)
    mi = pd.MultiIndex.from_tuples([("NYC", "Q1"), ("NYC", "Q2"), ("NYC", "Q3"), ("NYC", "Q4"), ("LA", "Q1"), ("LA", "Q2"), ("LA", "Q3"), ("LA", "Q4")], names=["city", "quarter"])
    revenue = pd.DataFrame({"product_A": [100, 150, 130, 180, 90, 120, 110, 160], "product_B": [200, 180, 220, 250, 170, 190, 200, 230]}, index=mi)
    swapped = revenue.swaplevel().sort_index()
    xs_nyc = revenue.xs("NYC", level="city")
    r.step(7, "verify MultiIndex operations (swaplevel)", swapped)
    r.step(8, "verify MultiIndex operations (xs)", xs_nyc)
    pct_of_annual = revenue.div(revenue.groupby(level="city").transform("sum")) * 100
    r.step(9, "verify groupby + transform on MultiIndex produces quarterly percentages", pct_of_annual)
    return r.snapshot()


def scenario_4() -> dict[str, Any]:
    r = ScenarioRecorder("scenario_4", "Categorical, cut/qcut, and get_dummies pipeline")
    np.random.seed(123)
    n = 200
    customers = pd.DataFrame({"age": np.random.randint(18, 75, n), "income": np.random.lognormal(10.5, 0.8, n).round(2), "spend": np.random.lognormal(6, 1.2, n).round(2), "region": np.random.choice(["Northeast", "Southeast", "Midwest", "West", "Southwest"], n), "loyalty_years": np.random.exponential(3, n).round(1)})
    r.step(1, "verify generated data shape and dtypes", customers)
    customers["age_bracket"] = pd.cut(customers["age"], bins=[0, 25, 35, 50, 65, 100], labels=["18-25", "26-35", "36-50", "51-65", "65+"], right=True)
    r.step(2, "verify cut produces ordered categorical with correct bin assignments", customers)
    customers["income_quartile"] = pd.qcut(customers["income"], q=4, labels=["Q1_low", "Q2_mid_low", "Q3_mid_high", "Q4_high"])
    r.step(3, "verify qcut distributes roughly equally", customers)
    customers["spend_decile"] = pd.qcut(customers["spend"], q=10, labels=False)
    r.step(4, "verify label-free qcut returns integer codes", customers)
    cross = pd.crosstab(customers["age_bracket"], customers["income_quartile"], margins=True, normalize="index").round(4)
    r.step(5, "verify cross-tabulation with normalized margins", cross)
    dummies = pd.get_dummies(customers[["region", "age_bracket"]], prefix={"region": "reg", "age_bracket": "age"}, drop_first=True, dtype=int)
    r.step(6, "verify one-hot encoding", dummies)
    segment = customers.groupby(["age_bracket", "income_quartile"], observed=False).agg(avg_spend=("spend", "mean"), med_spend=("spend", "median"), std_spend=("spend", "std"), count=("spend", "count"), loyalty=("loyalty_years", "mean")).round(2)
    segment["cv"] = (segment["std_spend"] / segment["avg_spend"]).round(4)
    r.step(7, "verify segmentation stats + coefficient of variation", segment)
    top_segments = segment.nlargest(5, "avg_spend")
    bottom_segments = segment.nsmallest(5, "avg_spend")
    r.step(8, "verify nlargest on MultiIndex DataFrame", top_segments)
    r.step(9, "verify nsmallest on MultiIndex DataFrame", bottom_segments)
    return r.snapshot()


def scenario_5() -> dict[str, Any]:
    r = ScenarioRecorder("scenario_5", "Merge-asof + rolling correlation + rank pipeline")
    np.random.seed(7)
    trade_times = pd.to_datetime(["2024-03-01 09:30:00", "2024-03-01 09:30:47", "2024-03-01 09:31:12", "2024-03-01 09:33:00", "2024-03-01 09:35:22", "2024-03-01 09:38:15", "2024-03-01 09:42:00", "2024-03-01 09:45:30", "2024-03-01 09:50:00", "2024-03-01 09:55:10"])
    trades = pd.DataFrame({"timestamp": trade_times, "symbol": ["AAPL"] * 5 + ["GOOG"] * 5, "price": [150.0, 150.5, 149.8, 151.2, 150.9, 140.0, 141.5, 139.8, 142.0, 141.0], "volume": [100, 200, 150, 300, 250, 500, 400, 350, 600, 450]})
    quote_times = pd.date_range("2024-03-01 09:30:00", periods=30, freq="min")
    quotes = pd.DataFrame({"timestamp": np.tile(quote_times[:15], 2), "symbol": ["AAPL"] * 15 + ["GOOG"] * 15, "bid": np.concatenate([150.0 + np.random.normal(0, 0.3, 15).cumsum(), 140.0 + np.random.normal(0, 0.2, 15).cumsum()]).round(2), "ask": np.concatenate([150.2 + np.random.normal(0, 0.3, 15).cumsum(), 140.3 + np.random.normal(0, 0.2, 15).cumsum()]).round(2)})
    quotes["spread"] = (quotes["ask"] - quotes["bid"]).round(4)
    r.step(1, "verify trade DataFrame", trades)
    r.step(2, "verify quote DataFrame", quotes)
    joined = pd.merge_asof(trades.sort_values("timestamp"), quotes.sort_values("timestamp"), on="timestamp", by="symbol", direction="backward", tolerance=pd.Timedelta("2min"))
    r.step(3, "verify asof join matches nearest prior quote per symbol within tolerance", joined)
    joined["slippage"] = (joined["price"] - joined["bid"]).round(4)
    joined["spread_pct"] = (joined["spread"] / joined["bid"] * 100).round(4)
    r.step(4, "verify computed trading metrics", joined)
    prices = pd.DataFrame({"AAPL": 150 + np.random.normal(0, 2, 60).cumsum(), "GOOG": 140 + np.random.normal(0, 1.5, 60).cumsum(), "MSFT": 380 + np.random.normal(0, 3, 60).cumsum(), "AMZN": 170 + np.random.normal(0, 2.5, 60).cumsum()}, index=pd.date_range("2024-01-01", periods=60, freq="B"))
    returns = prices.pct_change().dropna()
    r.step(5, "verify pct_change + dropna", returns)
    rolling_corr = returns["AAPL"].rolling(20).corr(returns["GOOG"])
    r.step(6, "verify rolling pairwise correlation", rolling_corr)
    full_corr = returns.corr().round(4)
    r.step(7, "verify full correlation matrix", full_corr)
    ranked = returns.rank(pct=True)
    r.step(8, "verify percentile ranking", ranked)
    ranked["AAPL_quintile"] = pd.qcut(ranked["AAPL"], 5, labels=["Q1", "Q2", "Q3", "Q4", "Q5"])
    quintile_returns = returns.groupby(ranked["AAPL_quintile"], observed=False)["GOOG"].mean()
    r.step(9, "verify quintile-bucketed cross-asset return analysis", quintile_returns)
    return r.snapshot()


def scenario_6() -> dict[str, Any]:
    r = ScenarioRecorder("scenario_6", "String accessor + explode + complex filtering")
    logs = pd.DataFrame({"raw": ["2024-01-15T10:30:00 ERROR [auth-service] Failed login for user=john@example.com ip=192.168.1.1 attempts=3", "2024-01-15T10:31:00 WARN [api-gateway] Rate limit approaching for user=jane@corp.io ip=10.0.0.5 attempts=1", "2024-01-15T10:32:00 ERROR [auth-service] Failed login for user=bob@test.org ip=192.168.1.1 attempts=5", "2024-01-15T10:33:00 INFO [data-pipeline] Batch processed records=15000 duration=45.2s status=ok", "2024-01-15T10:34:00 ERROR [api-gateway] Timeout connecting to upstream service=inventory latency=30.1s", "2024-01-15T10:35:00 WARN [auth-service] Account locked for user=bob@test.org ip=192.168.1.1 attempts=5"]})
    r.step(1, "verify raw log DataFrame", logs)
    logs["timestamp"] = pd.to_datetime(logs["raw"].str.extract(r"^(\S+)")[0])
    logs["level"] = logs["raw"].str.extract(r"\s(ERROR|WARN|INFO)\s")[0]
    logs["service"] = logs["raw"].str.extract(r"\[([^\]]+)\]")[0]
    logs["user"] = logs["raw"].str.extract(r"user=(\S+)")[0]
    logs["ip"] = logs["raw"].str.extract(r"ip=(\S+)")[0]
    r.step(2, "verify regex extraction into separate columns", logs)
    logs["domain"] = logs["user"].str.split("@").str[-1]
    logs["has_user"] = logs["user"].notna()
    r.step(3, "verify string split + null detection", logs)
    level_counts = logs.groupby("service")["level"].value_counts().unstack(fill_value=0)
    r.step(4, "verify value_counts + unstack produces service x level matrix", level_counts)
    tagged = pd.DataFrame({"item": ["Widget", "Gadget", "Doohickey"], "tags": [["sale", "featured", "new"], ["clearance", "sale"], ["new"]], "price": [29.99, 14.99, 49.99]})
    exploded = tagged.explode("tags")
    r.step(5, "verify explode duplicates rows per tag", exploded)
    tag_stats = exploded.groupby("tags").agg(num_items=("item", "count"), avg_price=("price", "mean"), items=("item", lambda x: sorted(x.tolist()))).sort_index()
    r.step(6, "verify grouped stats including list aggregation", tag_stats)
    error_logs = logs[(logs["level"] == "ERROR") & (logs["service"].str.contains("auth")) & (logs["ip"].notna()) & (logs["raw"].str.len() > 50)]
    r.step(7, "verify chained boolean filter", error_logs)
    filtered = logs.query("level == 'ERROR' or level == 'WARN'")
    r.step(8, "verify query-based filtering matches equivalent boolean indexing", filtered)
    return r.snapshot()


def scenario_7() -> dict[str, Any]:
    r = ScenarioRecorder("scenario_7", "where/mask, combine_first, update, and align")
    a = pd.Series([1, 2, np.nan, 4, 5], index=["a", "b", "c", "d", "e"])
    b = pd.Series([10, np.nan, 30, np.nan, 50], index=["a", "b", "c", "d", "e"])
    c = pd.Series([100, 200, 300], index=["c", "d", "f"])
    combined = a.combine_first(b)
    r.step(1, "verify combine_first fills NaN from b", combined)
    combined2 = combined.combine_first(c)
    r.step(2, "verify chained combine_first extends index and fills", combined2)
    df1 = pd.DataFrame({"x": [1, 2, 3, 4, 5], "y": [10, 20, 30, 40, 50]})
    df2 = pd.DataFrame({"x": [100, 200], "y": [1000, 2000]}, index=[1, 3])
    df1.update(df2)
    r.step(3, "verify update modifies df1 in-place at matching indices", df1)
    s = pd.Series([10, 20, 30, 40, 50], index=list("abcde"))
    masked = s.where(s > 20, other=-1)
    r.step(4, "verify where keeps values > 20", masked)
    masked2 = s.mask(s > 30, other=0)
    r.step(5, "verify mask zeroes values > 30", masked2)
    left = pd.DataFrame({"A": [1, 2, 3]}, index=["a", "b", "c"])
    right = pd.DataFrame({"A": [10, 20, 30]}, index=["b", "c", "d"])
    aligned_left, aligned_right = left.align(right, join="outer")
    r.step(6, "verify align outer produces union index with NaN fill (left)", aligned_left)
    r.step(7, "verify align outer produces union index with NaN fill (right)", aligned_right)
    inner_l, inner_r = left.align(right, join="inner")
    r.step(8, "verify align inner keeps only shared labels (left)", inner_l)
    r.step(9, "verify align inner keeps only shared labels (right)", inner_r)
    result = aligned_left.combine_first(aligned_right)
    r.step(10, "verify combine_first on aligned frames fills all gaps", result)
    return r.snapshot()


SCENARIOS: list[Callable[[], dict[str, Any]]] = [scenario_1, scenario_2, scenario_3, scenario_4, scenario_5, scenario_6, scenario_7]


def main() -> None:
    if pd.__version__ != PANDAS_VERSION:
        raise RuntimeError(f"Expected pandas {PANDAS_VERSION}, got {pd.__version__}")
    if np.__version__ != NUMPY_VERSION:
        raise RuntimeError(f"Expected numpy {NUMPY_VERSION}, got {np.__version__}")
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)
    for scenario in SCENARIOS:
        snapshot = scenario()
        out = SNAPSHOT_DIR / f"{snapshot['scenario']}.json"
        out.write_text(json.dumps(snapshot, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)} ({len(snapshot['steps'])} steps)")


if __name__ == "__main__":
    main()
