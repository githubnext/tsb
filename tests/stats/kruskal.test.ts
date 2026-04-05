import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { friedmanTest, kruskalWallis } from "../../src/stats/kruskal.ts";

describe("kruskalWallis", () => {
  it("detects significant difference between clearly separated groups", () => {
    const result = kruskalWallis([
      [1, 2, 3],
      [10, 11, 12],
      [20, 21, 22],
    ]);
    expect(result.statistic).toBeGreaterThan(7);
    expect(result.pValue).toBeLessThan(0.05);
    expect(result.df).toBe(2);
  });

  it("returns non-significant result for identical groups", () => {
    const result = kruskalWallis([
      [5, 5, 5],
      [5, 5, 5],
      [5, 5, 5],
    ]);
    // All ranks equal → H = 0
    expect(result.statistic).toBe(0);
    expect(result.pValue).toBeGreaterThan(0.99);
  });

  it("returns p-value close to 1 for nearly identical groups", () => {
    const result = kruskalWallis([
      [4, 5, 6],
      [4, 5, 6],
      [4, 5, 6],
    ]);
    expect(result.pValue).toBeGreaterThan(0.9);
  });

  it("handles two groups (df=1)", () => {
    const result = kruskalWallis([
      [1, 2, 3],
      [7, 8, 9],
    ]);
    expect(result.df).toBe(1);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("throws on fewer than 2 groups", () => {
    expect(() => kruskalWallis([[1, 2, 3]])).toThrow();
  });

  it("throws on empty group", () => {
    expect(() => kruskalWallis([[1, 2], []])).toThrow();
  });

  it("H statistic is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 10 }),
          { minLength: 2, maxLength: 5 },
        ),
        (groups) => {
          const result = kruskalWallis(groups);
          return result.statistic >= 0;
        },
      ),
    );
  });

  it("p-value is in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(fc.float({ min: -100, max: 100, noNaN: true }), { minLength: 1, maxLength: 10 }),
          { minLength: 2, maxLength: 5 },
        ),
        (groups) => {
          const result = kruskalWallis(groups);
          return result.pValue >= 0 && result.pValue <= 1;
        },
      ),
    );
  });

  it("df equals k-1", () => {
    const result = kruskalWallis([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]);
    expect(result.df).toBe(3);
  });
});

describe("friedmanTest", () => {
  it("detects significant column differences", () => {
    const data = [
      [9, 8, 7],
      [6, 5, 4],
      [3, 2, 1],
    ];
    const result = friedmanTest(data);
    expect(result.statistic).toBeGreaterThan(4);
    expect(result.pValue).toBeLessThan(0.2);
    expect(result.df).toBe(2);
  });

  it("returns non-significant for identical columns", () => {
    const data = [
      [5, 5, 5],
      [3, 3, 3],
      [7, 7, 7],
    ];
    const result = friedmanTest(data);
    expect(result.statistic).toBe(0);
    expect(result.pValue).toBeGreaterThan(0.99);
  });

  it("throws on fewer than 2 blocks", () => {
    expect(() => friedmanTest([[1, 2, 3]])).toThrow();
  });

  it("throws on fewer than 2 treatments", () => {
    expect(() => friedmanTest([[1], [2], [3]])).toThrow();
  });

  it("throws on unequal row lengths", () => {
    expect(() =>
      friedmanTest([
        [1, 2],
        [3, 4, 5],
      ]),
    ).toThrow();
  });

  it("p-value is in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc
          .array(
            fc.array(fc.float({ min: -100, max: 100, noNaN: true }), {
              minLength: 2,
              maxLength: 6,
            }),
            { minLength: 2, maxLength: 6 },
          )
          .filter((rows) => rows.every((r) => r.length === rows[0]?.length)),
        (data) => {
          const result = friedmanTest(data);
          return result.pValue >= 0 && result.pValue <= 1;
        },
      ),
    );
  });
});
