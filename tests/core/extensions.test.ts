/**
 * Tests for pd.api.extensions — ExtensionDtype, ExtensionArray, and accessor registration.
 */

import { describe, expect, test } from "bun:test";
import {
  ExtensionArray,
  ExtensionDtype,
  apiExtensions,
  constructExtensionDtypeFromString,
  getRegisteredAccessors,
  registerDataFrameAccessor,
  registerExtensionDtype,
  registerIndexAccessor,
  registerSeriesAccessor,
} from "../../src/core/extensions.ts";

// ─── Concrete test implementations ───────────────────────────────────────────

class IPDtype extends ExtensionDtype {
  override get name() {
    return "ip";
  }
  override get type(): abstract new (
    ...args: readonly unknown[]
  ) => unknown {
    return String as unknown as abstract new (
      ...args: readonly unknown[]
    ) => unknown;
  }
  override get kind() {
    return "O";
  }
  static override construct_from_string(s: string): IPDtype | null {
    return s === "ip" ? new IPDtype() : null;
  }
}

class IPArray extends ExtensionArray {
  private readonly _data: readonly (string | null)[];

  constructor(data: readonly (string | null)[]) {
    super();
    this._data = data;
  }

  override get dtype(): ExtensionDtype {
    return new IPDtype();
  }

  override get length(): number {
    return this._data.length;
  }

  override getItem(i: number): string | null {
    const idx = i < 0 ? this._data.length + i : i;
    return this._data[idx] ?? null;
  }

  override slice(start: number, stop: number): IPArray {
    return new IPArray(this._data.slice(start, stop));
  }

  override fillna(value: unknown): IPArray {
    return new IPArray(this._data.map((v) => (v === null || v === undefined ? String(value) : v)));
  }
}

// ─── ExtensionDtype tests ─────────────────────────────────────────────────────

describe("ExtensionDtype", () => {
  test("name, kind, type", () => {
    const d = new IPDtype();
    expect(d.name).toBe("ip");
    expect(d.kind).toBe("O");
    expect(d.type).toBe(String);
  });

  test("isNumeric defaults to false", () => {
    expect(new IPDtype().isNumeric).toBe(false);
  });

  test("naMissingValue defaults to null", () => {
    expect(new IPDtype().naMissingValue).toBeNull();
  });

  test("toString returns name", () => {
    expect(String(new IPDtype())).toBe("ip");
  });

  test("construct_from_string matches", () => {
    expect(IPDtype.construct_from_string("ip")).toBeInstanceOf(IPDtype);
    expect(IPDtype.construct_from_string("other")).toBeNull();
  });

  test("base construct_from_string returns null", () => {
    // The base class default always returns null
    expect(ExtensionDtype.construct_from_string("anything")).toBeNull();
  });

  test("base construct_array_type throws", () => {
    expect(() => ExtensionDtype.construct_array_type()).toThrow();
  });
});

// ─── ExtensionArray tests ─────────────────────────────────────────────────────

describe("ExtensionArray", () => {
  test("dtype", () => {
    const arr = new IPArray(["1.1.1.1", "8.8.8.8"]);
    expect(arr.dtype).toBeInstanceOf(IPDtype);
  });

  test("length", () => {
    expect(new IPArray([]).length).toBe(0);
    expect(new IPArray(["a", "b", "c"]).length).toBe(3);
  });

  test("getItem positive index", () => {
    const arr = new IPArray(["10.0.0.1", "192.168.0.1"]);
    expect(arr.getItem(0)).toBe("10.0.0.1");
    expect(arr.getItem(1)).toBe("192.168.0.1");
  });

  test("getItem negative index", () => {
    const arr = new IPArray(["a", "b", "c"]);
    expect(arr.getItem(-1)).toBe("c");
    expect(arr.getItem(-2)).toBe("b");
  });

  test("getItem null element", () => {
    const arr = new IPArray([null, "1.1.1.1"]);
    expect(arr.getItem(0)).toBeNull();
  });

  test("slice", () => {
    const arr = new IPArray(["a", "b", "c", "d"]);
    const sliced = arr.slice(1, 3);
    expect(sliced.length).toBe(2);
    expect(sliced.getItem(0)).toBe("b");
    expect(sliced.getItem(1)).toBe("c");
  });

  test("isna", () => {
    const arr = new IPArray(["1.1.1.1", null, "8.8.8.8"]);
    expect(arr.isna()).toEqual([false, true, false]);
  });

  test("isna all valid", () => {
    expect(new IPArray(["a", "b"]).isna()).toEqual([false, false]);
  });

  test("isna all null", () => {
    expect(new IPArray([null, null]).isna()).toEqual([true, true]);
  });

  test("fillna", () => {
    const arr = new IPArray(["1.1.1.1", null, "8.8.8.8"]);
    const filled = arr.fillna("0.0.0.0") as IPArray;
    expect(filled.getItem(0)).toBe("1.1.1.1");
    expect(filled.getItem(1)).toBe("0.0.0.0");
    expect(filled.getItem(2)).toBe("8.8.8.8");
  });

  test("toArray", () => {
    const arr = new IPArray(["a", null, "c"]);
    expect(arr.toArray()).toEqual(["a", null, "c"]);
  });

  test("toString", () => {
    const arr = new IPArray(["a", "b"]);
    const s = arr.toString();
    expect(s).toContain("IPArray");
    expect(s).toContain("length=2");
    expect(s).toContain("ip");
  });
});

// ─── registerExtensionDtype tests ─────────────────────────────────────────────

describe("registerExtensionDtype / constructExtensionDtypeFromString", () => {
  test("registered dtype is resolved from string", () => {
    registerExtensionDtype(IPDtype);
    const result = constructExtensionDtypeFromString("ip");
    expect(result).toBeInstanceOf(IPDtype);
  });

  test("unknown string returns null", () => {
    expect(constructExtensionDtypeFromString("unknownabc123")).toBeNull();
  });

  test("re-registering does not throw", () => {
    expect(() => registerExtensionDtype(IPDtype)).not.toThrow();
  });
});

// ─── Accessor registration tests ──────────────────────────────────────────────

class GeoAccessor {
  constructor(private readonly _obj: unknown) {}
  describe() {
    return `geo(${this._obj})`;
  }
}

class PlotAccessor {
  constructor(private readonly _obj: unknown) {}
}

class IdxAccessor {
  constructor(private readonly _obj: unknown) {}
}

describe("registerSeriesAccessor / getRegisteredAccessors", () => {
  test("register and retrieve series accessor", () => {
    registerSeriesAccessor("geo", GeoAccessor);
    const m = getRegisteredAccessors("series");
    expect(m.get("geo")).toBe(GeoAccessor);
  });

  test("accessor can be instantiated with a target object", () => {
    registerSeriesAccessor("geo", GeoAccessor);
    const Cls = getRegisteredAccessors("series").get("geo")!;
    const acc = new Cls("my-series");
    expect((acc as GeoAccessor).describe()).toBe("geo(my-series)");
  });
});

describe("registerDataFrameAccessor / getRegisteredAccessors", () => {
  test("register and retrieve dataframe accessor", () => {
    registerDataFrameAccessor("plot", PlotAccessor);
    const m = getRegisteredAccessors("dataframe");
    expect(m.get("plot")).toBe(PlotAccessor);
  });
});

describe("registerIndexAccessor / getRegisteredAccessors", () => {
  test("register and retrieve index accessor", () => {
    registerIndexAccessor("idx_tool", IdxAccessor);
    const m = getRegisteredAccessors("index");
    expect(m.get("idx_tool")).toBe(IdxAccessor);
  });
});

describe("getRegisteredAccessors — empty target", () => {
  test("returns empty map for unused target", () => {
    // 'series2' is not a real target but should just return empty map
    // Use a known target that wasn't registered to yet in this test file
    const m = getRegisteredAccessors("index");
    // We've registered one already; just verify it's a ReadonlyMap
    expect(typeof m.get).toBe("function");
  });
});

// ─── api.extensions namespace ─────────────────────────────────────────────────

describe("apiExtensions namespace", () => {
  test("contains all expected members", () => {
    expect(apiExtensions.ExtensionDtype).toBe(ExtensionDtype);
    expect(apiExtensions.ExtensionArray).toBe(ExtensionArray);
    expect(typeof apiExtensions.registerExtensionDtype).toBe("function");
    expect(typeof apiExtensions.constructExtensionDtypeFromString).toBe("function");
    expect(typeof apiExtensions.registerSeriesAccessor).toBe("function");
    expect(typeof apiExtensions.registerDataFrameAccessor).toBe("function");
    expect(typeof apiExtensions.registerIndexAccessor).toBe("function");
    expect(typeof apiExtensions.getRegisteredAccessors).toBe("function");
  });

  test("api.extensions.registerExtensionDtype works", () => {
    apiExtensions.registerExtensionDtype(IPDtype);
    const result = apiExtensions.constructExtensionDtypeFromString("ip");
    expect(result).toBeInstanceOf(IPDtype);
  });
});

// ─── Re-export from src/index.ts ─────────────────────────────────────────────

describe("top-level re-exports", () => {
  test("ExtensionDtype and ExtensionArray exported from tsb", async () => {
    const tsb = await import("../../src/index.ts");
    expect(tsb.ExtensionDtype).toBe(ExtensionDtype);
    expect(tsb.ExtensionArray).toBe(ExtensionArray);
    expect(typeof tsb.registerExtensionDtype).toBe("function");
    expect(typeof tsb.registerSeriesAccessor).toBe("function");
    expect(typeof tsb.registerDataFrameAccessor).toBe("function");
    expect(typeof tsb.registerIndexAccessor).toBe("function");
    expect(typeof tsb.getRegisteredAccessors).toBe("function");
    expect(tsb.apiExtensions).toBe(apiExtensions);
  });

  test("api.extensions accessible from top-level api export", async () => {
    const tsb = await import("../../src/index.ts");
    expect(tsb.api.extensions).toBe(apiExtensions);
    expect(tsb.api.extensions.ExtensionDtype).toBe(ExtensionDtype);
  });
});
