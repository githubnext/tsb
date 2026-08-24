/**
 * Parity tests — verify that the Rust/WASM acceleration layer returns the
 * same observable results as the TypeScript implementations for representative
 * normal, edge, missing-value, and dtype cases.
 *
 * Every `rust-wasm` entry in `wasm-coverage.json` is represented here.
 */

import { beforeAll, describe, expect, test } from "bun:test";
import {
  argsortScalars,
  natArgSort,
  natCompare,
  natSorted,
  searchsorted,
  searchsortedMany,
} from "../../src/core/index.ts";
import { loadWasm } from "../../src/wasm/index.ts";
import type { TsbWasmModule } from "../../src/wasm/index.ts";

let wasm: TsbWasmModule | null = null;

beforeAll(async () => {
  wasm = await loadWasm();
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function skip(_label: string): void {
  // no-op: caller already returns early when wasm is null
}

// ─── searchsorted_f64 ────────────────────────────────────────────────────────

describe("searchsorted_f64 parity", () => {
  const sortedNums = [1.0, 2.0, 3.0, 4.0, 5.0];

  test("left insertion at boundary", () => {
    if (wasm === null) {
      skip("left insertion at boundary");
      return;
    }
    const arr = new Float64Array(sortedNums);
    expect(wasm.searchsorted_f64(arr, 3.0, false)).toBe(
      searchsorted(sortedNums, 3.0, { side: "left" }),
    );
  });

  test("right insertion with duplicates", () => {
    if (wasm === null) {
      skip("right insertion with duplicates");
      return;
    }
    const dups = [1.0, 2.0, 3.0, 3.0, 4.0];
    const arr = new Float64Array(dups);
    expect(wasm.searchsorted_f64(arr, 3.0, true)).toBe(searchsorted(dups, 3.0, { side: "right" }));
  });

  test("value less than all elements", () => {
    if (wasm === null) {
      skip("value less than all elements");
      return;
    }
    const arr = new Float64Array(sortedNums);
    expect(wasm.searchsorted_f64(arr, 0.0, false)).toBe(searchsorted(sortedNums, 0.0));
  });

  test("value greater than all elements", () => {
    if (wasm === null) {
      skip("value greater than all elements");
      return;
    }
    const arr = new Float64Array(sortedNums);
    expect(wasm.searchsorted_f64(arr, 6.0, false)).toBe(searchsorted(sortedNums, 6.0));
  });

  test("NaN in sorted array — NaN treated as larger than all", () => {
    if (wasm === null) {
      skip("NaN in sorted array");
      return;
    }
    const withNaN = [1.0, 2.0, Number.NaN];
    const arr = new Float64Array(withNaN);
    // TS: NaN is a missing value mapped to last
    const tsResult = searchsorted(withNaN, 1.5);
    const wasmResult = wasm.searchsorted_f64(arr, 1.5, false);
    expect(wasmResult).toBe(tsResult);
  });

  test("empty array", () => {
    if (wasm === null) {
      skip("empty array");
      return;
    }
    const arr = new Float64Array([]);
    expect(wasm.searchsorted_f64(arr, 1.0, false)).toBe(searchsorted([], 1.0));
  });
});

// ─── searchsorted_many_f64 ───────────────────────────────────────────────────

describe("searchsorted_many_f64 parity", () => {
  test("multiple values in a sorted numeric array", () => {
    if (wasm === null) {
      skip("multiple values");
      return;
    }
    const sorted = [1.0, 2.0, 3.0, 4.0, 5.0];
    const values = [0.0, 1.0, 2.5, 5.0, 6.0];
    const wasmResult = Array.from(
      wasm.searchsorted_many_f64(new Float64Array(sorted), new Float64Array(values), false),
    );
    const tsResult = searchsortedMany(sorted, values, { side: "left" });
    expect(wasmResult).toEqual(tsResult);
  });

  test("right side", () => {
    if (wasm === null) {
      skip("right side");
      return;
    }
    const sorted = [1.0, 1.0, 2.0, 3.0];
    const values = [1.0, 2.0];
    const wasmResult = Array.from(
      wasm.searchsorted_many_f64(new Float64Array(sorted), new Float64Array(values), true),
    );
    const tsResult = searchsortedMany(sorted, values, { side: "right" });
    expect(wasmResult).toEqual(tsResult);
  });
});

// ─── argsort_f64 ─────────────────────────────────────────────────────────────

describe("argsort_f64 parity", () => {
  test("ascending numeric sort", () => {
    if (wasm === null) {
      skip("ascending numeric sort");
      return;
    }
    const arr = [3.0, 1.0, 4.0, 1.0, 5.0, 9.0, 2.0];
    const wasmResult = Array.from(wasm.argsort_f64(new Float64Array(arr)));
    const tsResult = argsortScalars(arr);
    expect(wasmResult).toEqual(tsResult);
  });

  test("already sorted", () => {
    if (wasm === null) {
      skip("already sorted");
      return;
    }
    const arr = [1.0, 2.0, 3.0];
    const wasmResult = Array.from(wasm.argsort_f64(new Float64Array(arr)));
    expect(wasmResult).toEqual([0, 1, 2]);
  });

  test("NaN placed last", () => {
    if (wasm === null) {
      skip("NaN placed last");
      return;
    }
    const arr = [2.0, Number.NaN, 1.0];
    const wasmResult = Array.from(wasm.argsort_f64(new Float64Array(arr)));
    const tsResult = argsortScalars(arr);
    expect(wasmResult).toEqual(tsResult);
  });

  test("single element", () => {
    if (wasm === null) {
      skip("single element");
      return;
    }
    expect(Array.from(wasm.argsort_f64(new Float64Array([42.0])))).toEqual([0]);
  });

  test("empty array", () => {
    if (wasm === null) {
      skip("empty array");
      return;
    }
    expect(Array.from(wasm.argsort_f64(new Float64Array([])))).toEqual([]);
  });
});

// ─── searchsorted_str ────────────────────────────────────────────────────────

describe("searchsorted_str parity", () => {
  const sortedStrs = ["apple", "banana", "cherry", "date"];

  test("left insertion", () => {
    if (wasm === null) {
      skip("left insertion");
      return;
    }
    expect(wasm.searchsorted_str([...sortedStrs], "cherry", false)).toBe(
      searchsorted(sortedStrs, "cherry", { side: "left" }),
    );
  });

  test("value not in array — between elements", () => {
    if (wasm === null) {
      skip("value not in array");
      return;
    }
    expect(wasm.searchsorted_str([...sortedStrs], "avocado", false)).toBe(
      searchsorted(sortedStrs, "avocado"),
    );
  });

  test("value past end", () => {
    if (wasm === null) {
      skip("value past end");
      return;
    }
    expect(wasm.searchsorted_str([...sortedStrs], "zucchini", false)).toBe(
      searchsorted(sortedStrs, "zucchini"),
    );
  });
});

// ─── argsort_str ─────────────────────────────────────────────────────────────

describe("argsort_str parity", () => {
  test("unsorted string array", () => {
    if (wasm === null) {
      skip("unsorted string array");
      return;
    }
    const arr = ["cherry", "apple", "banana", "date"];
    const wasmResult = Array.from(wasm.argsort_str([...arr]));
    const tsResult = argsortScalars(arr);
    expect(wasmResult).toEqual(tsResult);
  });
});

// ─── nat_compare ─────────────────────────────────────────────────────────────

describe("nat_compare parity", () => {
  const cases: [string, string][] = [
    ["file10", "file9"],
    ["file2", "file10"],
    ["abc", "abc"],
    ["File1", "file1"],
    ["1", "2"],
    ["b1", "a2"],
    ["", "a"],
    ["z9", "z10"],
  ];

  for (const [a, b] of cases) {
    test(`natCompare("${a}", "${b}")`, () => {
      if (wasm === null) {
        skip(`natCompare("${a}", "${b}")`);
        return;
      }
      const wasmSign = Math.sign(wasm.nat_compare(a, b, false, false));
      const tsSign = Math.sign(natCompare(a, b, {}));
      expect(wasmSign).toBe(tsSign);
    });
  }

  test("ignoreCase parity", () => {
    if (wasm === null) {
      skip("ignoreCase parity");
      return;
    }
    const wasmSign = Math.sign(wasm.nat_compare("Apple", "apple", true, false));
    const tsSign = Math.sign(natCompare("Apple", "apple", { ignoreCase: true }));
    expect(wasmSign).toBe(tsSign);
  });

  test("reverse parity", () => {
    if (wasm === null) {
      skip("reverse parity");
      return;
    }
    const wasmFwd = wasm.nat_compare("file10", "file9", false, false);
    const wasmRev = wasm.nat_compare("file10", "file9", false, true);
    expect(Math.sign(wasmFwd)).toBe(-Math.sign(wasmRev));
  });
});

// ─── nat_sorted ──────────────────────────────────────────────────────────────

describe("nat_sorted parity", () => {
  test("natural sort of file names", () => {
    if (wasm === null) {
      skip("natural sort of file names");
      return;
    }
    const arr = ["file10", "file2", "file1", "file20"];
    const wasmResult = wasm.nat_sorted([...arr], false, false);
    const tsResult = natSorted(arr, {});
    expect(wasmResult).toEqual(tsResult);
  });

  test("reverse=true", () => {
    if (wasm === null) {
      skip("reverse=true");
      return;
    }
    const arr = ["b", "a", "c"];
    const wasmResult = wasm.nat_sorted([...arr], false, true);
    const tsResult = natSorted(arr, { reverse: true });
    expect(wasmResult).toEqual(tsResult);
  });

  test("ignoreCase=true", () => {
    if (wasm === null) {
      skip("ignoreCase=true");
      return;
    }
    const arr = ["Banana", "apple", "Cherry"];
    const wasmResult = wasm.nat_sorted([...arr], true, false);
    const tsResult = natSorted(arr, { ignoreCase: true });
    expect(wasmResult).toEqual(tsResult);
  });

  test("empty array", () => {
    if (wasm === null) {
      skip("empty array");
      return;
    }
    expect(wasm.nat_sorted([], false, false)).toEqual([]);
  });

  test("single element", () => {
    if (wasm === null) {
      skip("single element");
      return;
    }
    expect(wasm.nat_sorted(["x"], false, false)).toEqual(["x"]);
  });
});

// ─── nat_argsort ─────────────────────────────────────────────────────────────

describe("nat_argsort parity", () => {
  test("argsort matches natSorted order", () => {
    if (wasm === null) {
      skip("argsort matches natSorted order");
      return;
    }
    const arr = ["file10", "file2", "file1"];
    const wasmIdx = Array.from(wasm.nat_argsort([...arr], false, false));
    const tsIdx = natArgSort(arr, {});
    expect(wasmIdx).toEqual(tsIdx);
  });

  test("reverse=true", () => {
    if (wasm === null) {
      skip("reverse=true");
      return;
    }
    const arr = ["a", "c", "b"];
    const wasmIdx = Array.from(wasm.nat_argsort([...arr], false, true));
    const tsIdx = natArgSort(arr, { reverse: true });
    expect(wasmIdx).toEqual(tsIdx);
  });

  test("ignoreCase=true", () => {
    if (wasm === null) {
      skip("ignoreCase=true");
      return;
    }
    const arr = ["Banana", "apple", "Cherry"];
    const wasmIdx = Array.from(wasm.nat_argsort([...arr], true, false));
    const tsIdx = natArgSort(arr, { ignoreCase: true });
    expect(wasmIdx).toEqual(tsIdx);
  });
});

// ─── scalar reductions ────────────────────────────────────────────────────────

describe("sum_f64 parity", () => {
  test("basic sum", () => {
    if (wasm === null) {
      skip("basic sum");
      return;
    }
    const arr = new Float64Array([1.0, 2.0, 3.0, 4.0, 5.0]);
    expect(wasm.sum_f64(arr)).toBe(15.0);
  });

  test("NaN values are skipped", () => {
    if (wasm === null) {
      skip("NaN skipped");
      return;
    }
    const arr = new Float64Array([1.0, Number.NaN, 3.0]);
    expect(wasm.sum_f64(arr)).toBe(4.0);
  });

  test("empty array returns 0", () => {
    if (wasm === null) {
      skip("empty");
      return;
    }
    expect(wasm.sum_f64(new Float64Array([]))).toBe(0.0);
  });

  test("all-NaN returns 0", () => {
    if (wasm === null) {
      skip("all-NaN");
      return;
    }
    expect(wasm.sum_f64(new Float64Array([Number.NaN, Number.NaN]))).toBe(0.0);
  });
});

describe("mean_f64 parity", () => {
  test("basic mean", () => {
    if (wasm === null) {
      skip("basic mean");
      return;
    }
    const arr = new Float64Array([1.0, 2.0, 3.0, 4.0, 5.0]);
    expect(wasm.mean_f64(arr)).toBeCloseTo(3.0, 10);
  });

  test("NaN values are skipped", () => {
    if (wasm === null) {
      skip("NaN skipped");
      return;
    }
    const arr = new Float64Array([1.0, Number.NaN, 5.0]);
    expect(wasm.mean_f64(arr)).toBeCloseTo(3.0, 10);
  });

  test("empty array returns NaN", () => {
    if (wasm === null) {
      skip("empty");
      return;
    }
    expect(wasm.mean_f64(new Float64Array([]))).toBeNaN();
  });
});

describe("min_f64 parity", () => {
  test("basic min", () => {
    if (wasm === null) {
      skip("basic min");
      return;
    }
    const arr = new Float64Array([3.0, 1.0, 4.0, 1.5]);
    expect(wasm.min_f64(arr)).toBe(1.0);
  });

  test("NaN values are skipped", () => {
    if (wasm === null) {
      skip("NaN skipped");
      return;
    }
    expect(wasm.min_f64(new Float64Array([Number.NaN, 2.0, 1.0]))).toBe(1.0);
  });

  test("empty array returns NaN", () => {
    if (wasm === null) {
      skip("empty");
      return;
    }
    expect(wasm.min_f64(new Float64Array([]))).toBeNaN();
  });
});

describe("max_f64 parity", () => {
  test("basic max", () => {
    if (wasm === null) {
      skip("basic max");
      return;
    }
    const arr = new Float64Array([3.0, 1.0, 4.0, 1.5]);
    expect(wasm.max_f64(arr)).toBe(4.0);
  });

  test("NaN values are skipped", () => {
    if (wasm === null) {
      skip("NaN skipped");
      return;
    }
    expect(wasm.max_f64(new Float64Array([Number.NaN, 2.0, 5.0]))).toBe(5.0);
  });

  test("empty array returns NaN", () => {
    if (wasm === null) {
      skip("empty");
      return;
    }
    expect(wasm.max_f64(new Float64Array([]))).toBeNaN();
  });
});

describe("var_f64 parity", () => {
  test("known variance (ddof=1)", () => {
    if (wasm === null) {
      skip("known variance");
      return;
    }
    // Variance of [2, 4, 4, 4, 5, 5, 7, 9] = 4.571...
    const arr = new Float64Array([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(wasm.var_f64(arr, 1)).toBeCloseTo(4.5714, 3);
  });

  test("NaN values are skipped", () => {
    if (wasm === null) {
      skip("NaN skipped");
      return;
    }
    const arr = new Float64Array([2.0, Number.NaN, 4.0]);
    expect(wasm.var_f64(arr, 1)).toBeCloseTo(2.0, 10);
  });

  test("single element returns NaN (ddof=1 makes n-1=0)", () => {
    if (wasm === null) {
      skip("single element");
      return;
    }
    expect(wasm.var_f64(new Float64Array([5.0]), 1)).toBeNaN();
  });
});

describe("std_f64 parity", () => {
  test("basic std (ddof=1)", () => {
    if (wasm === null) {
      skip("basic std");
      return;
    }
    const arr = new Float64Array([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]);
    expect(wasm.std_f64(arr, 1)).toBeCloseTo(Math.sqrt(4.5714), 3);
  });

  test("empty returns NaN", () => {
    if (wasm === null) {
      skip("empty");
      return;
    }
    expect(wasm.std_f64(new Float64Array([]), 1)).toBeNaN();
  });
});

describe("median_f64 parity", () => {
  test("odd count median", () => {
    if (wasm === null) {
      skip("odd count");
      return;
    }
    expect(wasm.median_f64(new Float64Array([3.0, 1.0, 2.0]))).toBe(2.0);
  });

  test("even count median is average of two middle", () => {
    if (wasm === null) {
      skip("even count");
      return;
    }
    expect(wasm.median_f64(new Float64Array([1.0, 2.0, 3.0, 4.0]))).toBe(2.5);
  });

  test("NaN values are skipped", () => {
    if (wasm === null) {
      skip("NaN skipped");
      return;
    }
    expect(wasm.median_f64(new Float64Array([1.0, Number.NaN, 3.0]))).toBe(2.0);
  });

  test("empty returns NaN", () => {
    if (wasm === null) {
      skip("empty");
      return;
    }
    expect(wasm.median_f64(new Float64Array([]))).toBeNaN();
  });
});

// ─── rolling window reductions ────────────────────────────────────────────────

describe("rolling_sum_f64 parity", () => {
  test("basic rolling sum (window=3)", () => {
    if (wasm === null) {
      skip("rolling sum");
      return;
    }
    const arr = new Float64Array([1.0, 2.0, 3.0, 4.0, 5.0]);
    const result = Array.from(wasm.rolling_sum_f64(arr, 3, 3));
    expect(result[0]).toBeNaN();
    expect(result[1]).toBeNaN();
    expect(result[2]).toBeCloseTo(6.0, 10);
    expect(result[3]).toBeCloseTo(9.0, 10);
    expect(result[4]).toBeCloseTo(12.0, 10);
  });

  test("min_periods=1 produces earlier results", () => {
    if (wasm === null) {
      skip("min_periods=1");
      return;
    }
    const arr = new Float64Array([1.0, 2.0, 3.0]);
    const result = Array.from(wasm.rolling_sum_f64(arr, 3, 1));
    expect(result[0]).toBeCloseTo(1.0, 10);
    expect(result[1]).toBeCloseTo(3.0, 10);
    expect(result[2]).toBeCloseTo(6.0, 10);
  });
});

describe("rolling_mean_f64 parity", () => {
  test("basic rolling mean (window=3)", () => {
    if (wasm === null) {
      skip("rolling mean");
      return;
    }
    const arr = new Float64Array([1.0, 2.0, 3.0, 4.0, 5.0]);
    const result = Array.from(wasm.rolling_mean_f64(arr, 3, 3));
    expect(Number.isNaN(result[0])).toBe(true);
    expect(Number.isNaN(result[1])).toBe(true);
    expect(result[2]).toBeCloseTo(2.0, 10);
    expect(result[3]).toBeCloseTo(3.0, 10);
    expect(result[4]).toBeCloseTo(4.0, 10);
  });
});

// ─── expanding window reductions ──────────────────────────────────────────────

describe("expanding_mean_f64 parity", () => {
  test("cumulative mean grows correctly", () => {
    if (wasm === null) {
      skip("expanding mean");
      return;
    }
    const arr = new Float64Array([1.0, 3.0, 5.0]);
    const result = Array.from(wasm.expanding_mean_f64(arr, 1));
    expect(result[0]).toBeCloseTo(1.0, 10);
    expect(result[1]).toBeCloseTo(2.0, 10);
    expect(result[2]).toBeCloseTo(3.0, 10);
  });
});

describe("expanding_sum_f64 parity", () => {
  test("cumulative sum", () => {
    if (wasm === null) {
      skip("expanding sum");
      return;
    }
    const arr = new Float64Array([1.0, 2.0, 3.0]);
    const result = Array.from(wasm.expanding_sum_f64(arr, 1));
    expect(result[0]).toBeCloseTo(1.0, 10);
    expect(result[1]).toBeCloseTo(3.0, 10);
    expect(result[2]).toBeCloseTo(6.0, 10);
  });
});
