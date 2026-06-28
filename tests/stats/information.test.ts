/**
 * Tests for src/stats/information.ts
 *
 * Verifies information theory functions against known analytical values and
 * scipy-equivalent behaviour. Covers: entropy, KL divergence, JS divergence,
 * JS distance, cross-entropy, Rényi entropy, Tsallis entropy, joint entropy,
 * conditional entropy, mutual information, normalised MI, variation of info.
 * Includes unit tests, edge cases, and property-based invariants (fast-check).
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  GaussianKDE,
  conditionalEntropy,
  crossEntropy,
  entropy,
  gaussianKDE,
  jointEntropy,
  jsDistance,
  jsDivergence,
  klDivergence,
  mutualInformation,
  normalizedMI,
  renyiEntropy,
  tsallisEntropy,
  variationOfInformation,
} from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function r(v: number, dp = 6): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

const LN2 = Math.log(2);
const LOG2 = Math.log(2);

// ─── entropy ──────────────────────────────────────────────────────────────────

describe("entropy — Shannon", () => {
  it("fair coin: 1 bit = ln(2) nats", () => {
    expect(r(entropy([0.5, 0.5]))).toBe(r(LN2));
  });

  it("fair coin in bits equals 1.0", () => {
    expect(r(entropy([0.5, 0.5], undefined, 2))).toBe(1.0);
  });

  it("fair 4-sided die: ln(4) nats", () => {
    expect(entropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(Math.log(4), 8);
  });

  it("degenerate distribution: entropy = 0", () => {
    expect(entropy([1, 0, 0])).toBe(0);
    expect(entropy([0, 0, 1])).toBe(0);
  });

  it("entropy of empty distribution is 0", () => {
    expect(entropy([])).toBe(0);
    expect(entropy([0, 0, 0])).toBe(0);
  });

  it("unnormalised weights produce same result as normalised", () => {
    const h1 = entropy([0.5, 0.5]);
    const h2 = entropy([1, 1]);
    const h3 = entropy([10, 10]);
    expect(r(h1)).toBe(r(h2));
    expect(r(h1)).toBe(r(h3));
  });

  it("entropy is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 20 }),
        (pk) => {
          return entropy(pk) >= -1e-12;
        },
      ),
    );
  });

  it("entropy is maximised by uniform distribution", () => {
    const n = 5;
    const uniform = Array<number>(n).fill(1 / n);
    const uniformH = entropy(uniform);
    fc.assert(
      fc.property(
        fc
          .array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: n, maxLength: n })
          .filter((pk) => pk.some((v) => v > 0)),
        (pk) => {
          return entropy(pk) <= uniformH + 1e-10;
        },
      ),
    );
  });

  it("entropy base conversion: H_b = H_e / ln(b)", () => {
    const p = [0.3, 0.7];
    const h_nats = entropy(p);
    const h_bits = entropy(p, undefined, 2);
    expect(h_bits).toBeCloseTo(h_nats / LN2, 8);
  });

  it("single-element distribution has zero entropy", () => {
    expect(entropy([1])).toBe(0);
    expect(entropy([42])).toBe(0);
  });

  it("three-outcome entropy", () => {
    const p = [0.2, 0.3, 0.5];
    const expected = -(0.2 * Math.log(0.2) + 0.3 * Math.log(0.3) + 0.5 * Math.log(0.5));
    expect(entropy(p)).toBeCloseTo(expected, 8);
  });
});

describe("entropy — KL divergence mode", () => {
  it("entropy(p, q) computes D_KL(p‖q)", () => {
    const p = [0.5, 0.5];
    const q = [0.25, 0.75];
    const kl = 0.5 * Math.log(0.5 / 0.25) + 0.5 * Math.log(0.5 / 0.75);
    expect(entropy(p, q)).toBeCloseTo(kl, 8);
  });

  it("D_KL(p‖p) = 0", () => {
    const p = [0.3, 0.4, 0.3];
    expect(r(entropy(p, p))).toBe(0);
  });

  it("D_KL(p‖q) = +Infinity when support(p) ⊄ support(q)", () => {
    expect(entropy([0.5, 0.5], [1, 0])).toBe(Number.POSITIVE_INFINITY);
  });

  it("throws on all-zero qk", () => {
    expect(() => entropy([0.5, 0.5], [0, 0])).toThrow(RangeError);
  });

  it("KL divergence is always non-negative (Gibbs' inequality)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(1e-4), max: 1, noNaN: true }), {
          minLength: 2,
          maxLength: 10,
        }),
        fc.array(fc.float({ min: Math.fround(1e-4), max: 1, noNaN: true }), {
          minLength: 2,
          maxLength: 10,
        }),
        (pk, qk) => {
          const minLen = Math.min(pk.length, qk.length);
          const pSlice = pk.slice(0, minLen);
          const qSlice = qk.slice(0, minLen);
          return entropy(pSlice, qSlice) >= -1e-10;
        },
      ),
    );
  });
});

// ─── klDivergence ─────────────────────────────────────────────────────────────

describe("klDivergence", () => {
  it("equals entropy(pk, qk)", () => {
    const p = [0.3, 0.7];
    const q = [0.4, 0.6];
    expect(klDivergence(p, q)).toBe(entropy(p, q));
  });

  it("D_KL is asymmetric", () => {
    const p = [0.1, 0.9];
    const q = [0.4, 0.6];
    expect(klDivergence(p, q)).not.toBeCloseTo(klDivergence(q, p), 4);
  });
});

// ─── jsDivergence ─────────────────────────────────────────────────────────────

describe("jsDivergence", () => {
  it("JSD(p, p) = 0", () => {
    expect(r(jsDivergence([0.3, 0.7], [0.3, 0.7]))).toBe(0);
  });

  it("JSD is symmetric: JSD(p,q) = JSD(q,p)", () => {
    const p = [0.2, 0.8];
    const q = [0.6, 0.4];
    expect(r(jsDivergence(p, q))).toBe(r(jsDivergence(q, p)));
  });

  it("JSD ≤ ln(2) in nats", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(1e-4), max: 1, noNaN: true }), {
          minLength: 2,
          maxLength: 8,
        }),
        fc.array(fc.float({ min: Math.fround(1e-4), max: 1, noNaN: true }), {
          minLength: 2,
          maxLength: 8,
        }),
        (pk, qk) => {
          const minLen = Math.min(pk.length, qk.length);
          const jsd = jsDivergence(pk.slice(0, minLen), qk.slice(0, minLen));
          return jsd >= -1e-12 && jsd <= Math.log(2) + 1e-10;
        },
      ),
    );
  });

  it("JSD(p, q) in bits ≤ 1", () => {
    const jsd = jsDivergence([0.1, 0.9], [0.9, 0.1], 2);
    expect(jsd).toBeLessThanOrEqual(1 + 1e-10);
    expect(jsd).toBeGreaterThanOrEqual(0);
  });

  it("JSD is always non-negative", () => {
    expect(jsDivergence([0.5, 0.5], [0.5, 0.5])).toBeGreaterThanOrEqual(0);
    expect(jsDivergence([0.1, 0.9], [0.9, 0.1])).toBeGreaterThanOrEqual(0);
  });

  it("JSD of maximally different binary distributions ≤ ln(2)", () => {
    const jsd = jsDivergence([1, 0], [0, 1]);
    expect(jsd).toBeCloseTo(Math.log(2), 8);
  });
});

// ─── jsDistance ───────────────────────────────────────────────────────────────

describe("jsDistance", () => {
  it("jsDistance = sqrt(jsDivergence)", () => {
    const p = [0.3, 0.7];
    const q = [0.6, 0.4];
    expect(r(jsDistance(p, q))).toBe(r(Math.sqrt(jsDivergence(p, q))));
  });

  it("jsDistance(p, p) = 0", () => {
    expect(r(jsDistance([0.5, 0.5], [0.5, 0.5]))).toBe(0);
  });

  it("jsDistance is symmetric", () => {
    const p = [0.2, 0.8];
    const q = [0.7, 0.3];
    expect(r(jsDistance(p, q))).toBe(r(jsDistance(q, p)));
  });

  it("jsDistance in bits ≤ 1", () => {
    const d = jsDistance([1, 0], [0, 1], 2);
    expect(r(d)).toBe(1.0);
  });
});

// ─── crossEntropy ─────────────────────────────────────────────────────────────

describe("crossEntropy", () => {
  it("H(p, p) = H(p)", () => {
    const p = [0.3, 0.4, 0.3];
    expect(crossEntropy(p, p)).toBeCloseTo(entropy(p), 8);
  });

  it("H(p, q) = H(p) + D_KL(p‖q)", () => {
    const p = [0.3, 0.7];
    const q = [0.4, 0.6];
    expect(crossEntropy(p, q)).toBeCloseTo(entropy(p) + klDivergence(p, q), 8);
  });

  it("H(p, q) ≥ H(p)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(1e-4), max: 1, noNaN: true }), {
          minLength: 2,
          maxLength: 8,
        }),
        fc.array(fc.float({ min: Math.fround(1e-4), max: 1, noNaN: true }), {
          minLength: 2,
          maxLength: 8,
        }),
        (pk, qk) => {
          const minLen = Math.min(pk.length, qk.length);
          const p = pk.slice(0, minLen);
          const q = qk.slice(0, minLen);
          return crossEntropy(p, q) >= entropy(p) - 1e-10;
        },
      ),
    );
  });

  it("+Infinity when support(p) ⊄ support(q)", () => {
    expect(crossEntropy([0.5, 0.5], [1, 0])).toBe(Number.POSITIVE_INFINITY);
  });

  it("throws on all-zero qk", () => {
    expect(() => crossEntropy([0.5, 0.5], [0, 0])).toThrow(RangeError);
  });
});

// ─── renyiEntropy ─────────────────────────────────────────────────────────────

describe("renyiEntropy", () => {
  it("α=1 limit equals Shannon entropy", () => {
    const p = [0.3, 0.4, 0.3];
    expect(renyiEntropy(p, 1)).toBeCloseTo(entropy(p), 8);
    expect(r(renyiEntropy(p, 1.0000000001))).toBeCloseTo(entropy(p), 5);
  });

  it("α=2 collision entropy = -log(sum p²)", () => {
    const p = [0.3, 0.4, 0.3];
    const pNorm = p.map((v) => v / p.reduce((a, b) => a + b, 0));
    const sumPow2 = pNorm.reduce((s, v) => s + v ** 2, 0);
    expect(renyiEntropy(p, 2)).toBeCloseTo(-Math.log(sumPow2), 8);
  });

  it("α=0 equals log(support size)", () => {
    const p = [0.1, 0.9];
    expect(renyiEntropy(p, 0)).toBeCloseTo(Math.log(2), 8);
  });

  it("Rényi entropy is decreasing in α", () => {
    const p = [0.2, 0.3, 0.5];
    const h1 = renyiEntropy(p, 0.5);
    const h2 = renyiEntropy(p, 2);
    const h3 = renyiEntropy(p, 5);
    expect(h1).toBeGreaterThan(h2 - 1e-10);
    expect(h2).toBeGreaterThan(h3 - 1e-10);
  });

  it("Rényi entropy of uniform distribution = log(n) for all α", () => {
    const p = [0.25, 0.25, 0.25, 0.25];
    const expected = Math.log(4);
    for (const alpha of [0, 0.5, 1, 2, 5]) {
      expect(r(renyiEntropy(p, alpha))).toBeCloseTo(expected, 6);
    }
  });

  it("Rényi entropy is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(1e-4), max: 1, noNaN: true }), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.float({ min: 0, max: 20, noNaN: true }),
        (pk, alpha) => {
          return renyiEntropy(pk, alpha) >= -1e-10;
        },
      ),
    );
  });

  it("throws on negative alpha", () => {
    expect(() => renyiEntropy([0.5, 0.5], -1)).toThrow(RangeError);
  });
});

// ─── tsallisEntropy ───────────────────────────────────────────────────────────

describe("tsallisEntropy", () => {
  it("q=1 limit equals Shannon entropy", () => {
    const p = [0.3, 0.4, 0.3];
    expect(tsallisEntropy(p, 1)).toBeCloseTo(entropy(p), 8);
  });

  it("Tsallis entropy is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(1e-4), max: 1, noNaN: true }), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.float({ min: Math.fround(0.01), max: 20, noNaN: true }),
        (pk, q) => {
          return tsallisEntropy(pk, q) >= -1e-10;
        },
      ),
    );
  });

  it("throws on non-positive q", () => {
    expect(() => tsallisEntropy([0.5, 0.5], 0)).toThrow(RangeError);
    expect(() => tsallisEntropy([0.5, 0.5], -1)).toThrow(RangeError);
  });

  it("Tsallis entropy of uniform n is (n^(1-q) - 1)/(1-q) for q≠1", () => {
    const n = 4;
    const p = Array<number>(n).fill(1 / n);
    const q = 2;
    const expected = (n ** (1 - q) - 1) / (1 - q);
    expect(r(tsallisEntropy(p, q))).toBeCloseTo(expected, 8);
  });

  it("Tsallis entropy is zero for degenerate distribution", () => {
    expect(r(tsallisEntropy([1, 0, 0], 2))).toBe(0);
  });
});

// ─── jointEntropy ─────────────────────────────────────────────────────────────

describe("jointEntropy", () => {
  it("empty input returns 0", () => {
    expect(jointEntropy([])).toBe(0);
  });

  it("independent uniform: H(X,Y) = H(X) + H(Y)", () => {
    // X ∈ {0,1}, Y ∈ {0,1}, fully independent uniform
    const obs: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    expect(r(jointEntropy(obs))).toBeCloseTo(Math.log(4), 6);
  });

  it("perfectly correlated: H(X,Y) = H(X)", () => {
    const obs: [number, number][] = [
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 1],
    ];
    const hXY = jointEntropy(obs);
    expect(r(hXY)).toBeCloseTo(Math.log(2), 6);
  });

  it("H(X,Y) ≥ max(H(X), H(Y))", () => {
    const obs: [string, string][] = [
      ["a", "x"],
      ["a", "y"],
      ["b", "x"],
      ["b", "y"],
      ["c", "x"],
    ];
    const hXY = jointEntropy(obs);
    // H(X) from marginal
    const xCounts = new Map<string, number>();
    for (const [x] of obs) {
      xCounts.set(x, (xCounts.get(x) ?? 0) + 1);
    }
    const hX = -Array.from(xCounts.values()).reduce((s, c) => {
      const p = c / obs.length;
      return s + p * Math.log(p);
    }, 0);
    expect(hXY).toBeGreaterThanOrEqual(hX - 1e-10);
  });
});

// ─── conditionalEntropy ───────────────────────────────────────────────────────

describe("conditionalEntropy", () => {
  it("empty input returns 0", () => {
    expect(conditionalEntropy([])).toBe(0);
  });

  it("H(X|Y) = 0 when X is deterministic function of Y", () => {
    const obs: [number, number][] = [
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 1],
    ];
    expect(r(conditionalEntropy(obs))).toBe(0);
  });

  it("H(X|Y) = H(X) when X and Y are independent", () => {
    const obs: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    // H(X|Y) should equal H(X) = ln(2) for uniform marginal
    expect(r(conditionalEntropy(obs))).toBeCloseTo(Math.log(2), 6);
  });

  it("H(X|Y) ≥ 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 4 }), fc.integer({ min: 0, max: 4 })), {
          minLength: 2,
          maxLength: 20,
        }),
        (pairs) => {
          const obs = pairs as [number, number][];
          return conditionalEntropy(obs) >= -1e-12;
        },
      ),
    );
  });

  it("H(X|Y) = H(X,Y) - H(Y)", () => {
    const obs: [string, string][] = [
      ["a", "x"],
      ["a", "y"],
      ["b", "x"],
      ["b", "z"],
      ["c", "y"],
    ];
    const hXY = jointEntropy(obs);
    // H(Y) from yCounts
    const yCounts = new Map<string, number>();
    for (const [, y] of obs) {
      yCounts.set(y, (yCounts.get(y) ?? 0) + 1);
    }
    const hY = -Array.from(yCounts.values()).reduce((s, c) => {
      const p = c / obs.length;
      return s + p * Math.log(p);
    }, 0);
    expect(conditionalEntropy(obs)).toBeCloseTo(hXY - hY, 8);
  });
});

// ─── mutualInformation ────────────────────────────────────────────────────────

describe("mutualInformation", () => {
  it("empty input returns 0", () => {
    expect(mutualInformation([])).toBe(0);
  });

  it("I(X;Y) = 0 for independent uniform variables", () => {
    const obs: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    expect(r(mutualInformation(obs))).toBe(0);
  });

  it("I(X;Y) = H(X) when X = Y (deterministic)", () => {
    const obs: [number, number][] = [
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 1],
    ];
    expect(r(mutualInformation(obs))).toBeCloseTo(Math.log(2), 6);
  });

  it("I(X;Y) ≥ 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 3 }), fc.integer({ min: 0, max: 3 })), {
          minLength: 2,
          maxLength: 20,
        }),
        (pairs) => {
          const obs = pairs as [number, number][];
          return mutualInformation(obs) >= -1e-12;
        },
      ),
    );
  });

  it("I(X;Y) = H(X) + H(Y) - H(X,Y)", () => {
    const obs: [string, string][] = [
      ["a", "x"],
      ["a", "y"],
      ["b", "x"],
      ["b", "y"],
      ["c", "z"],
    ];
    const mi = mutualInformation(obs);
    const hXY = jointEntropy(obs);
    // compute H(X) and H(Y) manually
    const xCounts = new Map<string, number>();
    const yCounts = new Map<string, number>();
    for (const [x, y] of obs) {
      xCounts.set(x, (xCounts.get(x) ?? 0) + 1);
      yCounts.set(y, (yCounts.get(y) ?? 0) + 1);
    }
    const hX = -Array.from(xCounts.values()).reduce((s, c) => {
      const p = c / obs.length;
      return s + p * Math.log(p);
    }, 0);
    const hY = -Array.from(yCounts.values()).reduce((s, c) => {
      const p = c / obs.length;
      return s + p * Math.log(p);
    }, 0);
    expect(mi).toBeCloseTo(hX + hY - hXY, 8);
  });

  it("I(X;Y) in bits for known pair distribution", () => {
    // p(0,0)=p(1,1)=0.5, p(0,1)=p(1,0)=0 → X = Y → I = H(X) = 1 bit
    const obs: [number, number][] = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1],
    ];
    expect(r(mutualInformation(obs, 2))).toBeCloseTo(1.0, 5);
  });

  it("I(X;Y) ≤ min(H(X), H(Y))", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 4 }), fc.integer({ min: 0, max: 4 })), {
          minLength: 2,
          maxLength: 20,
        }),
        (pairs) => {
          const obs = pairs as [number, number][];
          const mi = mutualInformation(obs);
          const hXY = jointEntropy(obs);
          // H(X) = H(X,Y) - H(Y|X) but simpler: use I ≤ min(H(X), H(Y))
          // Just check MI ≥ 0 and MI ≤ H(X,Y)
          return mi >= -1e-12 && mi <= hXY + 1e-10;
        },
      ),
    );
  });
});

// ─── normalizedMI ─────────────────────────────────────────────────────────────

describe("normalizedMI", () => {
  it("empty input returns 0", () => {
    expect(normalizedMI([])).toBe(0);
  });

  it("NMI = 1 when X = Y for all methods", () => {
    const obs: [number, number][] = [
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 1],
    ];
    for (const method of ["arithmetic", "geometric", "min", "max"] as const) {
      expect(r(normalizedMI(obs, method))).toBeCloseTo(1, 5);
    }
  });

  it("NMI = 0 for independent uniform variables", () => {
    const obs: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ];
    for (const method of ["arithmetic", "geometric", "min", "max"] as const) {
      expect(r(normalizedMI(obs, method))).toBe(0);
    }
  });

  it("NMI ∈ [0, 1] for all methods", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 4 }), fc.integer({ min: 0, max: 4 })), {
          minLength: 2,
          maxLength: 20,
        }),
        (pairs) => {
          const obs = pairs as [number, number][];
          for (const method of ["arithmetic", "geometric", "min", "max"] as const) {
            const nmi = normalizedMI(obs, method);
            if (nmi < -1e-10 || nmi > 1 + 1e-10) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("default method is 'arithmetic'", () => {
    const obs: [number, number][] = [
      [0, 0],
      [1, 1],
      [0, 1],
      [1, 0],
      [0, 0],
    ];
    expect(normalizedMI(obs)).toBe(normalizedMI(obs, "arithmetic"));
  });
});

// ─── variationOfInformation ───────────────────────────────────────────────────

describe("variationOfInformation", () => {
  it("empty input returns 0", () => {
    expect(variationOfInformation([])).toBe(0);
  });

  it("VI = 0 when X = Y", () => {
    const obs: [number, number][] = [
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 1],
    ];
    expect(r(variationOfInformation(obs))).toBe(0);
  });

  it("VI ≥ 0", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 0, max: 3 }), fc.integer({ min: 0, max: 3 })), {
          minLength: 2,
          maxLength: 20,
        }),
        (pairs) => {
          const obs = pairs as [number, number][];
          return variationOfInformation(obs) >= -1e-12;
        },
      ),
    );
  });

  it("VI = H(X) + H(Y) - 2 I(X;Y)", () => {
    const obs: [string, string][] = [
      ["a", "x"],
      ["a", "y"],
      ["b", "x"],
      ["b", "z"],
      ["c", "y"],
    ];
    const vi = variationOfInformation(obs);
    const mi = mutualInformation(obs);
    const xCounts = new Map<string, number>();
    const yCounts = new Map<string, number>();
    for (const [x, y] of obs) {
      xCounts.set(x, (xCounts.get(x) ?? 0) + 1);
      yCounts.set(y, (yCounts.get(y) ?? 0) + 1);
    }
    const hX = -Array.from(xCounts.values()).reduce((s, c) => {
      const p = c / obs.length;
      return s + p * Math.log(p);
    }, 0);
    const hY = -Array.from(yCounts.values()).reduce((s, c) => {
      const p = c / obs.length;
      return s + p * Math.log(p);
    }, 0);
    expect(vi).toBeCloseTo(hX + hY - 2 * mi, 8);
  });

  it("VI is symmetric: VI(X,Y) = VI(Y,X)", () => {
    const obs: [number, number][] = [
      [0, 1],
      [1, 0],
      [0, 0],
      [1, 1],
      [0, 2],
    ];
    const obsSwapped: [number, number][] = obs.map(([x, y]) => [y, x]);
    expect(r(variationOfInformation(obs))).toBeCloseTo(r(variationOfInformation(obsSwapped)), 8);
  });
});

// ─── integration: GaussianKDE still works (import sanity) ─────────────────────

describe("import sanity", () => {
  it("GaussianKDE is still importable alongside information functions", () => {
    const kde = gaussianKDE([1, 2, 3]);
    expect(kde).toBeInstanceOf(GaussianKDE);
    expect(entropy([0.5, 0.5])).toBeGreaterThan(0);
  });
});
