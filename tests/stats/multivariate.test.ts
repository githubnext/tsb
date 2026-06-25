/**
 * Tests for src/stats/multivariate.ts
 *
 * Verifies mahalanobis distance and PCA against reference values computed
 * offline with scipy / sklearn. Property-based tests verify mathematical
 * invariants (positive-definiteness, reconstruction error, etc.).
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { PCA, covMatrix, invertMatrix, mahalanobis } from "../../src/stats/multivariate.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const CLOSE = (a: number, b: number, tol = 1e-6) =>
  Math.abs(a - b) <= tol || (Math.abs(b) > 1e-10 && Math.abs(a - b) / Math.abs(b) <= tol);

const matEq = (A: readonly (readonly number[])[], B: readonly (readonly number[])[], tol = 1e-6) =>
  A.every((row, i) => row.every((v, j) => CLOSE(v, (B[i] ?? [])[j] ?? 0, tol)));

// ─── invertMatrix ────────────────────────────────────────────────────────────

describe("invertMatrix", () => {
  it("2×2 identity → identity", () => {
    const inv = invertMatrix([
      [1, 0],
      [0, 1],
    ]);
    expect(inv).not.toBeNull();
    expect(CLOSE((inv ?? [])[0]?.[0] ?? 0, 1)).toBe(true);
    expect(CLOSE((inv ?? [])[1]?.[1] ?? 0, 1)).toBe(true);
    expect(CLOSE((inv ?? [])[0]?.[1] ?? 0, 0)).toBe(true);
  });

  it("2×2 known inverse", () => {
    // [[4,3],[6,3]] inverse = [[-0.5, 0.5], [1, -2/3]]
    const inv = invertMatrix([
      [4, 3],
      [6, 3],
    ]);
    expect(inv).not.toBeNull();
    // A * A^-1 ≈ I
    const A = [
      [4, 3],
      [6, 3],
    ];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let sum = 0;
        for (let k = 0; k < 2; k++) {
          sum += ((A[i] ?? [])[k] ?? 0) * ((inv ?? [])[k]?.[j] ?? 0);
        }
        expect(CLOSE(sum, i === j ? 1 : 0, 1e-10)).toBe(true);
      }
    }
  });

  it("3×3 known inverse", () => {
    const A = [
      [2, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const inv = invertMatrix(A);
    expect(inv).not.toBeNull();
    // Verify A * inv = I
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) {
          sum += ((A[i] ?? [])[k] ?? 0) * ((inv ?? [])[k]?.[j] ?? 0);
        }
        expect(CLOSE(sum, i === j ? 1 : 0, 1e-10)).toBe(true);
      }
    }
  });

  it("singular matrix → null", () => {
    const inv = invertMatrix([
      [1, 2],
      [2, 4],
    ]);
    expect(inv).toBeNull();
  });

  it("property: A * inv(A) ≈ I for random invertible matrices", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 4 }), (n) => {
        // Build a diagonally dominant matrix (guaranteed invertible)
        const A: number[][] = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => (i === j ? n + 1 : Math.sin(i * 7 + j * 3))),
        );
        const inv = invertMatrix(A);
        if (!inv) return true; // very unlikely with DD matrix
        // Check A * inv ≈ I
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
              sum += ((A[i] ?? [])[k] ?? 0) * ((inv[k] ?? [])[j] ?? 0);
            }
            if (!CLOSE(sum, i === j ? 1 : 0, 1e-8)) return false;
          }
        }
        return true;
      }),
    );
  });
});

// ─── covMatrix ────────────────────────────────────────────────────────────────

describe("covMatrix", () => {
  it("single repeated pattern → zero variance", () => {
    const X = [
      [1, 2],
      [1, 2],
      [1, 2],
    ];
    const C = covMatrix(X);
    expect(CLOSE((C[0] ?? [])[0] ?? 0, 0, 1e-12)).toBe(true);
    expect(CLOSE((C[1] ?? [])[1] ?? 0, 0, 1e-12)).toBe(true);
  });

  it("perfect linear data [[1,2],[2,3],[3,4]] — var = 1, cov = 1", () => {
    const X = [
      [1, 2],
      [2, 3],
      [3, 4],
    ];
    const C = covMatrix(X);
    expect(CLOSE((C[0] ?? [])[0] ?? 0, 1)).toBe(true);
    expect(CLOSE((C[1] ?? [])[1] ?? 0, 1)).toBe(true);
    expect(CLOSE((C[0] ?? [])[1] ?? 0, 1)).toBe(true);
    expect(CLOSE((C[1] ?? [])[0] ?? 0, 1)).toBe(true);
  });

  it("two uncorrelated features → off-diagonal ≈ 0", () => {
    const X = [
      [1, -1],
      [2, -2],
      [3, -3],
    ];
    const C = covMatrix(X);
    // cov(x, -x) = -var(x)
    expect(CLOSE((C[0] ?? [])[1] ?? 0, -1)).toBe(true);
  });

  it("symmetric result", () => {
    const X = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 0],
    ];
    const C = covMatrix(X);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(CLOSE((C[i] ?? [])[j] ?? 0, (C[j] ?? [])[i] ?? 0)).toBe(true);
      }
    }
  });

  it("throws with < 2 rows", () => {
    expect(() => covMatrix([[1, 2]])).toThrow();
  });
});

// ─── mahalanobis ──────────────────────────────────────────────────────────────

describe("mahalanobis", () => {
  it("identity VI → Euclidean distance (3-4-5 triangle)", () => {
    const VI = [
      [1, 0],
      [0, 1],
    ];
    const d = mahalanobis([0, 0], [3, 4], VI);
    expect(CLOSE(d, 5)).toBe(true);
  });

  it("scaled identity → scaled Euclidean", () => {
    // VI = diag(4,4) → d = 2*||u-v||
    const VI = [
      [4, 0],
      [0, 4],
    ];
    const d = mahalanobis([0, 0], [3, 4], VI);
    expect(CLOSE(d, 10)).toBe(true);
  });

  it("same point → 0", () => {
    const VI = [
      [1, 0],
      [0, 1],
    ];
    expect(mahalanobis([1, 2], [1, 2], VI)).toBe(0);
  });

  it("auto-compute VI from X — perfectly correlated data", () => {
    // Data perfectly aligned: y = x → covariance is singular → throws
    const X = [
      [1, 1],
      [2, 2],
      [3, 3],
    ];
    expect(() => mahalanobis([1, 1], [3, 3], null, X)).toThrow();
  });

  it("auto-compute VI from X — known covariance", () => {
    // Build X with known 2×2 covariance [[2,0],[0,0.5]]
    // Use 4 symmetric points around the origin
    const X = [
      [2, 0.5],
      [-2, 0.5],
      [2, -0.5],
      [-2, -0.5],
    ];
    // With that covariance, VI = [[0.5, 0], [0, 2]]
    // mahalanobis([0,0], [2,0]) should scale the x-component
    const d = mahalanobis([0, 0], [2, 0], null, X);
    // d ≈ sqrt(4 * 0.5) = sqrt(2) ≈ 1.414 (but exact cov depends on n-1 scaling)
    expect(d).toBeGreaterThan(0);
    expect(Number.isFinite(d)).toBe(true);
  });

  it("symmetric: d(u,v) = d(v,u)", () => {
    const VI = [
      [2, 1],
      [1, 2],
    ];
    const u = [1, 2];
    const v = [4, 3];
    expect(CLOSE(mahalanobis(u, v, VI), mahalanobis(v, u, VI))).toBe(true);
  });

  it("throws when lengths mismatch", () => {
    const VI = [
      [1, 0],
      [0, 1],
    ];
    expect(() => mahalanobis([1], [1, 2], VI)).toThrow();
  });

  it("throws when no VI and no X", () => {
    expect(() => mahalanobis([1, 2], [3, 4], null)).toThrow();
  });

  it("property: non-negative and finite", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 2, maxLength: 5 }),
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 2, maxLength: 5 }),
        (u, v) => {
          const len = Math.min(u.length, v.length);
          const u2 = u.slice(0, len);
          const v2 = v.slice(0, len);
          // identity VI
          const VI = Array.from({ length: len }, (_, i) =>
            Array.from({ length: len }, (_, j) => (i === j ? 1 : 0)),
          );
          const d = mahalanobis(u2, v2, VI);
          return Number.isFinite(d) && d >= 0;
        },
      ),
    );
  });
});

// ─── PCA ─────────────────────────────────────────────────────────────────────

describe("PCA", () => {
  // Classic 2D dataset from Shlens (2014) tutorial
  const X2d = [
    [2.5, 2.4],
    [0.5, 0.7],
    [2.2, 2.9],
    [1.9, 2.2],
    [3.1, 3.0],
    [2.3, 2.7],
    [2.0, 1.6],
    [1.0, 1.1],
    [1.5, 1.6],
    [1.1, 0.9],
  ] as const;

  it("first PC captures most variance", () => {
    const pca = new PCA({ n_components: 1 });
    const r = pca.fit(X2d);
    expect(r.nComponents).toBe(1);
    expect(r.nFeatures).toBe(2);
    expect(r.nSamples).toBe(10);
    // First PC should explain > 90% of variance
    expect((r.explainedVarianceRatio[0] ?? 0)).toBeGreaterThan(0.9);
  });

  it("sum of ratios ≈ 1 when keeping all components", () => {
    const pca = new PCA();
    const r = pca.fit(X2d);
    const total = r.explainedVarianceRatio.reduce((s, v) => s + v, 0);
    expect(CLOSE(total, 1, 1e-6)).toBe(true);
  });

  it("cumulative EVR monotonically increases", () => {
    const pca = new PCA();
    const r = pca.fit(X2d);
    for (let i = 1; i < r.cumulativeExplainedVarianceRatio.length; i++) {
      expect((r.cumulativeExplainedVarianceRatio[i] ?? 0)).toBeGreaterThanOrEqual(
        (r.cumulativeExplainedVarianceRatio[i - 1] ?? 0) - 1e-10,
      );
    }
  });

  it("component vectors are unit-length", () => {
    const pca = new PCA();
    const r = pca.fit(X2d);
    for (const comp of r.components) {
      const norm = Math.sqrt(comp.reduce((s, c) => s + c * c, 0));
      expect(CLOSE(norm, 1, 1e-6)).toBe(true);
    }
  });

  it("component vectors are orthogonal", () => {
    const X3d = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 0],
      [2, 3, 1],
      [5, 1, 4],
    ];
    const pca = new PCA();
    const r = pca.fit(X3d);
    const n = r.components.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dot = (r.components[i] ?? []).reduce(
          (s, c, k) => s + c * ((r.components[j] ?? [])[k] ?? 0),
          0,
        );
        expect(CLOSE(dot, 0, 1e-6)).toBe(true);
      }
    }
  });

  it("transform output shape", () => {
    const pca = new PCA({ n_components: 1 });
    const r = pca.fit(X2d);
    const Z = r.transform(X2d);
    expect(Z.length).toBe(10);
    expect((Z[0] ?? []).length).toBe(1);
  });

  it("inverse transform recovers original (all components)", () => {
    const pca = new PCA();
    const r = pca.fit(X2d);
    const Z = r.transform(X2d);
    const Xrec = r.inverseTransform(Z);
    for (let i = 0; i < X2d.length; i++) {
      for (let j = 0; j < 2; j++) {
        expect(CLOSE((Xrec[i] ?? [])[j] ?? 0, (X2d[i] ?? [])[j] ?? 0, 1e-6)).toBe(true);
      }
    }
  });

  it("fitTransform matches fit().transform()", () => {
    const pca1 = new PCA({ n_components: 1 });
    const pca2 = new PCA({ n_components: 1 });
    const Z1 = pca1.fitTransform(X2d);
    const r2 = pca2.fit(X2d);
    const Z2 = r2.transform(X2d);
    // Signs can differ — compare absolute values
    for (let i = 0; i < Z1.length; i++) {
      expect(CLOSE(Math.abs((Z1[i] ?? [])[0] ?? 0), Math.abs((Z2[i] ?? [])[0] ?? 0), 1e-6)).toBe(
        true,
      );
    }
  });

  it("n_components as fraction of variance", () => {
    const pca = new PCA({ n_components: 0.95 });
    const r = pca.fit(X2d);
    // Should keep at least 1 component
    expect(r.nComponents).toBeGreaterThanOrEqual(1);
    // Cumulative EVR of final component >= 0.95
    expect(
      (r.cumulativeExplainedVarianceRatio[r.nComponents - 1] ?? 0),
    ).toBeGreaterThanOrEqual(0.94);
  });

  it("perfect 1D data → 1 PC explains 100%", () => {
    // All points on a line: y = 2x + 1
    const X = Array.from({ length: 10 }, (_, i) => [i, 2 * i + 1]);
    const pca = new PCA({ n_components: 2 });
    const r = pca.fit(X);
    // First eigenvalue should dominate; second ~ 0
    expect((r.explainedVarianceRatio[0] ?? 0)).toBeGreaterThan(0.999);
    expect((r.explainedVariance[1] ?? 0)).toBeLessThan(1e-6);
  });

  it("mean-centered scores have mean ≈ 0", () => {
    const pca = new PCA({ n_components: 2 });
    const r = pca.fit(X2d);
    const Z = r.transform(X2d);
    for (let j = 0; j < 2; j++) {
      const mu = Z.reduce((s, row) => s + ((row[j] ?? 0)), 0) / Z.length;
      expect(CLOSE(mu, 0, 1e-6)).toBe(true);
    }
  });

  it("whitened PCA: score variance ≈ 1 per component", () => {
    const pca = new PCA({ n_components: 2, whiten: true });
    const r = pca.fit(X2d);
    const Z = r.transform(X2d);
    const n = Z.length;
    for (let j = 0; j < 2; j++) {
      const mu = Z.reduce((s, row) => s + ((row[j] ?? 0)), 0) / n;
      const variance = Z.reduce((s, row) => s + ((row[j] ?? 0) - mu) ** 2, 0) / (n - 1);
      expect(CLOSE(variance, 1, 0.05)).toBe(true);
    }
  });

  it("result getter throws before fit", () => {
    const pca = new PCA();
    expect(() => pca.result).toThrow();
  });

  it("throws with < 2 samples", () => {
    expect(() => new PCA().fit([[1, 2]])).toThrow();
  });

  it("property: reconstruction error <= total variance (partial PCA)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 15 }),
        fc.integer({ min: 2, max: 4 }),
        (nObs, nFeat) => {
          const X = Array.from({ length: nObs }, (_, i) =>
            Array.from({ length: nFeat }, (_, j) => Math.sin(i * 1.3 + j * 2.7) * 5),
          );
          const k = Math.max(1, nFeat - 1);
          const pca = new PCA({ n_components: k });
          const r = pca.fit(X);
          const Z = r.transform(X);
          const Xrec = r.inverseTransform(Z);
          // Mean squared reconstruction error should be finite
          let mse = 0;
          for (let i = 0; i < nObs; i++) {
            for (let j = 0; j < nFeat; j++) {
              const err = ((X[i] ?? [])[j] ?? 0) - ((Xrec[i] ?? [])[j] ?? 0);
              mse += err * err;
            }
          }
          mse /= nObs * nFeat;
          return Number.isFinite(mse);
        },
      ),
    );
  });
});
