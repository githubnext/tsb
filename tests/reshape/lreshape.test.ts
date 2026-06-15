/**
 * Tests for src/reshape/lreshape.ts — lreshape (wide → long with named groups).
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, type Scalar, lreshape } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function colValues(df: DataFrame, col: string): Scalar[] {
  return [...df.col(col).values];
}

// ─── basic lreshape ───────────────────────────────────────────────────────────

describe("lreshape", () => {
  describe("basic usage", () => {
    it("reshapes a single group of two columns", () => {
      const df = DataFrame.fromColumns({
        id: ["a", "b"],
        v1: [1, 2],
        v2: [3, 4],
      });
      const result = lreshape(df, { v: ["v1", "v2"] });
      // 2 rows × 2 block positions = 4 output rows
      expect(result.shape[0]).toBe(4);
      expect(result.columns.values).toEqual(["id", "v"]);
      // Block 0: v1 values, Block 1: v2 values
      expect(colValues(result, "id")).toEqual(["a", "b", "a", "b"]);
      expect(colValues(result, "v")).toEqual([1, 2, 3, 4]);
    });

    it("reshapes multiple groups simultaneously", () => {
      const df = DataFrame.fromColumns({
        hr: [14, 7],
        team: ["Red", "Blue"],
        v1: [1, 3],
        v2: [2, 4],
        w1: [10, 30],
        w2: [20, 40],
      });
      const result = lreshape(df, { v: ["v1", "v2"], w: ["w1", "w2"] });
      expect(result.shape[0]).toBe(4);
      expect(result.columns.values).toEqual(["hr", "team", "v", "w"]);
      expect(colValues(result, "v")).toEqual([1, 3, 2, 4]);
      expect(colValues(result, "w")).toEqual([10, 30, 20, 40]);
    });

    it("preserves id columns repeated per block", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2, 3],
        x1: [10, 20, 30],
        x2: [40, 50, 60],
      });
      const result = lreshape(df, { x: ["x1", "x2"] });
      expect(result.shape[0]).toBe(6);
      expect(colValues(result, "id")).toEqual([1, 2, 3, 1, 2, 3]);
      expect(colValues(result, "x")).toEqual([10, 20, 30, 40, 50, 60]);
    });

    it("works with a single row", () => {
      const df = DataFrame.fromColumns({
        a: [5],
        b1: [1],
        b2: [2],
        b3: [3],
      });
      const result = lreshape(df, { b: ["b1", "b2", "b3"] });
      expect(result.shape[0]).toBe(3);
      expect(colValues(result, "a")).toEqual([5, 5, 5]);
      expect(colValues(result, "b")).toEqual([1, 2, 3]);
    });

    it("works with no id columns (all columns in groups)", () => {
      const df = DataFrame.fromColumns({
        x1: [1, 2],
        x2: [3, 4],
      });
      const result = lreshape(df, { x: ["x1", "x2"] });
      expect(result.shape[0]).toBe(4);
      expect(result.columns.values).toEqual(["x"]);
      expect(colValues(result, "x")).toEqual([1, 2, 3, 4]);
    });
  });

  describe("dropna behaviour", () => {
    it("drops rows where any value column is null by default", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2, 3],
        v1: [1, null, 3],
        v2: [4, 5, 6],
      });
      const result = lreshape(df, { v: ["v1", "v2"] });
      // Row with id=2 in block 0 (v1=null) is dropped; all block-1 rows kept
      expect(result.shape[0]).toBe(5);
      const ids = colValues(result, "id");
      expect(ids).not.toContain(null);
      // id=2 is still present in block 1 (v2=5)
      expect(ids).toContain(2);
    });

    it("keeps null rows when dropna=false", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2],
        v1: [1, null],
        v2: [3, 4],
      });
      const result = lreshape(df, { v: ["v1", "v2"] }, { dropna: false });
      expect(result.shape[0]).toBe(4);
      expect(colValues(result, "v")).toEqual([1, null, 3, 4]);
    });

    it("drops rows where NaN appears in value column", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2],
        v1: [1, Number.NaN],
        v2: [3, 4],
      });
      // block 0, row 1 → v1=NaN → dropped; block 1, row 1 → v2=4 → kept
      const result = lreshape(df, { v: ["v1", "v2"] });
      expect(result.shape[0]).toBe(3);
    });
  });

  describe("edge cases", () => {
    it("returns empty DataFrame for empty source", () => {
      const df = DataFrame.fromColumns({ id: [] as Scalar[], v1: [] as Scalar[], v2: [] as Scalar[] });
      const result = lreshape(df, { v: ["v1", "v2"] });
      expect(result.shape[0]).toBe(0);
      expect(result.columns.values).toEqual(["id", "v"]);
    });

    it("returns source DataFrame when groups is empty", () => {
      const df = DataFrame.fromColumns({ a: [1, 2], b: [3, 4] });
      const result = lreshape(df, {});
      expect(result.shape[0]).toBe(2);
    });

    it("throws when group lists have different lengths", () => {
      const df = DataFrame.fromColumns({
        v1: [1, 2],
        v2: [3, 4],
        w1: [5, 6],
      });
      expect(() => lreshape(df, { v: ["v1", "v2"], w: ["w1"] })).toThrow(
        /same length/,
      );
    });

    it("throws when a referenced column does not exist", () => {
      const df = DataFrame.fromColumns({ a: [1, 2] });
      expect(() => lreshape(df, { x: ["a", "MISSING"] })).toThrow(
        /not found/,
      );
    });

    it("result always has a RangeIndex", () => {
      const df = DataFrame.fromColumns({ id: [1, 2], v1: [10, 20], v2: [30, 40] });
      const result = lreshape(df, { v: ["v1", "v2"] });
      const idxVals = [...result.index.values];
      expect(idxVals).toEqual([0, 1, 2, 3]);
    });

    it("handles string values in value columns", () => {
      const df = DataFrame.fromColumns({
        id: [1, 2],
        a1: ["x", "y"],
        a2: ["p", "q"],
      });
      const result = lreshape(df, { a: ["a1", "a2"] });
      expect(colValues(result, "a")).toEqual(["x", "y", "p", "q"]);
    });

    it("handles three-group reshape correctly", () => {
      const df = DataFrame.fromColumns({
        name: ["Alice", "Bob"],
        score1: [80, 70],
        score2: [85, 75],
        score3: [90, 80],
      });
      const result = lreshape(df, { score: ["score1", "score2", "score3"] });
      expect(result.shape[0]).toBe(6);
      expect(colValues(result, "score")).toEqual([80, 70, 85, 75, 90, 80]);
      expect(colValues(result, "name")).toEqual([
        "Alice", "Bob", "Alice", "Bob", "Alice", "Bob",
      ]);
    });
  });

  describe("property-based tests", () => {
    it("output row count equals nRows * k (when dropna=false)", () => {
      fc.assert(
        fc.property(
          // Generate a small DataFrame with 1-4 id cols and 2-4 value cols
          fc.nat({ max: 4 }).chain((nId) =>
            fc.nat({ max: 3 }).chain((k) =>
              fc.integer({ min: 1, max: 8 }).map((nRows) => {
                const data: Record<string, Scalar[]> = {};
                for (let i = 0; i < nId; i++) {
                  data[`id${i}`] = Array.from({ length: nRows }, (_, j) => j + i);
                }
                for (let vi = 0; vi < k + 1; vi++) {
                  data[`v${vi}`] = Array.from({ length: nRows }, (_, j) => j * 10 + vi);
                }
                return { data, nId, k: k + 1, nRows };
              }),
            ),
          ),
          ({ data, nId, k, nRows }) => {
            const df = DataFrame.fromColumns(data);
            const groups: Record<string, string[]> = { v: [] };
            for (let vi = 0; vi < k; vi++) {
              (groups["v"] as string[]).push(`v${vi}`);
            }
            const result = lreshape(df, groups, { dropna: false });
            expect(result.shape[0]).toBe(nRows * k);
          },
        ),
        { numRuns: 50 },
      );
    });

    it("id column values are repeated k times each row (dropna=false)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }).chain((nRows) =>
            fc.integer({ min: 2, max: 4 }).map((k) => ({ nRows, k })),
          ),
          ({ nRows, k }) => {
            const ids = Array.from({ length: nRows }, (_, i) => i + 1);
            const data: Record<string, Scalar[]> = { id: ids };
            for (let vi = 0; vi < k; vi++) {
              data[`v${vi}`] = Array.from({ length: nRows }, (_, j) => j * k + vi);
            }
            const groups: Record<string, string[]> = { v: [] };
            for (let vi = 0; vi < k; vi++) {
              (groups["v"] as string[]).push(`v${vi}`);
            }
            const df = DataFrame.fromColumns(data);
            const result = lreshape(df, groups, { dropna: false });
            const outIds = colValues(result, "id");
            // Each original id appears exactly k times
            for (const id of ids) {
              const count = outIds.filter((v) => v === id).length;
              expect(count).toBe(k);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
