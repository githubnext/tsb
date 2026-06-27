/**
 * Benchmark: pd.api.extensions — ExtensionDtype / ExtensionArray / accessor registration.
 *
 * Covers:
 *   - ExtensionDtype subclassing              → pandas `pandas.api.extensions.ExtensionDtype`
 *   - ExtensionArray subclassing              → pandas `pandas.api.extensions.ExtensionArray`
 *   - registerExtensionDtype()                → pandas `register_extension_dtype()`
 *   - constructExtensionDtypeFromString()     → pandas dtype string resolution
 *   - registerSeriesAccessor()                → pandas `register_series_accessor()`
 *   - registerDataFrameAccessor()             → pandas `register_dataframe_accessor()`
 *   - getRegisteredAccessors()                → accessor registry lookup
 *
 * Outputs JSON: {"function": "extensions", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  ExtensionDtype,
  ExtensionArray,
  registerExtensionDtype,
  constructExtensionDtypeFromString,
  registerSeriesAccessor,
  registerDataFrameAccessor,
  getRegisteredAccessors,
} from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 200;

class TagDtype extends ExtensionDtype {
  override get name(): string {
    return "tag";
  }
  override get type(): abstract new (...args: readonly unknown[]) => unknown {
    return String as unknown as abstract new (...args: readonly unknown[]) => unknown;
  }
  override get kind(): string {
    return "O";
  }
  override get isNumeric(): boolean {
    return false;
  }
  static override construct_from_string(dtype: string): TagDtype | null {
    return dtype === "tag" ? new TagDtype() : null;
  }
}

class TagArray extends ExtensionArray {
  private readonly _data: readonly string[];
  constructor(data: readonly string[]) {
    super();
    this._data = data;
  }
  override get dtype(): TagDtype {
    return new TagDtype();
  }
  override get length(): number {
    return this._data.length;
  }
  override getItem(i: number): string | null {
    const idx = i < 0 ? this._data.length + i : i;
    return this._data[idx] ?? null;
  }
  override slice(start: number, stop: number): TagArray {
    return new TagArray(this._data.slice(start, stop));
  }
}

class GeoAccessor {
  constructor(_obj: unknown) {}
  distance(): number {
    return 0;
  }
}

// Register once — idempotent for repeated benchmark runs
registerExtensionDtype(TagDtype as unknown as { new (): ExtensionDtype } & typeof ExtensionDtype);
registerSeriesAccessor("geo_bench", GeoAccessor);
registerDataFrameAccessor("geo_bench", GeoAccessor);

function run(): void {
  const dt = constructExtensionDtypeFromString("tag");
  const _name = dt?.name;

  const arr = new TagArray(["alpha", "beta", "gamma", "delta", "epsilon"]);
  const _len = arr.length;
  const _item = arr.getItem(2);
  const _neg = arr.getItem(-1);
  const _sliced = arr.slice(1, 4);
  const _dtype = arr.dtype.name;
  const _numeric = arr.dtype.isNumeric;

  const seriesMap = getRegisteredAccessors("series");
  const _hasSeries = seriesMap.has("geo_bench");
  const dfMap = getRegisteredAccessors("dataframe");
  const _hasDf = dfMap.has("geo_bench");
  const idxMap = getRegisteredAccessors("index");
  const _idxSize = idxMap.size;

  void [_name, _len, _item, _neg, _sliced, _dtype, _numeric, _hasSeries, _hasDf, _idxSize];
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "extensions",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
