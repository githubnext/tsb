/**
 * Tests for Hidden Markov Model (GaussianHMM, MultinomialHMM).
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { GaussianHMM, MultinomialHMM, fitGaussianHMM, hmmViterbi } from "../../src/stats/hmm.ts";

// ─── GaussianHMM ──────────────────────────────────────────────────────────────

describe("GaussianHMM", () => {
  it("fits a 2-state model on well-separated data", () => {
    // State 0: N(0, 0.1), State 1: N(5, 0.1)
    const obs: number[] = [];
    for (let i = 0; i < 50; i++) {
      obs.push(i % 5 < 3 ? 0 + 0.1 * (Math.random() - 0.5) : 5 + 0.1 * (Math.random() - 0.5));
    }

    const model = new GaussianHMM({ nComponents: 2, nIter: 200 });
    const fit = model.fit(obs);

    // Means should be approximately 0 and 5
    const sortedMeans = [...fit.means].sort((a, b) => a - b);
    expect(sortedMeans[0]).toBeLessThan(2);
    expect(sortedMeans[1]).toBeGreaterThan(3);
    expect(fit.startProb.length).toBe(2);
    expect(fit.transmat.length).toBe(2);
    expect(fit.logProb).toBeLessThan(0); // log-prob is negative
    expect(fit.nIterDone).toBeGreaterThan(0);
  });

  it("predict returns array of length T", () => {
    const obs = [0.1, 0.2, 5.0, 5.1, 0.05, 5.2, 0.15, 5.3];
    const model = new GaussianHMM({ nComponents: 2, nIter: 100 });
    model.fit(obs);
    const states = model.predict(obs);
    expect(states.length).toBe(obs.length);
    for (const s of states) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2);
    }
  });

  it("score returns a finite log-prob", () => {
    const obs = [0.1, 0.2, 0.15, 5.0, 5.1, 4.9, 0.08];
    const model = new GaussianHMM({ nComponents: 2, nIter: 100 });
    model.fit(obs);
    const lp = model.score(obs);
    expect(Number.isFinite(lp)).toBe(true);
    expect(lp).toBeLessThan(0);
  });

  it("predictProba returns probabilities summing to ~1", () => {
    const obs = [0.1, 5.0, 0.2, 5.1, 0.05];
    const model = new GaussianHMM({ nComponents: 2, nIter: 100 });
    model.fit(obs);
    const proba = model.predictProba(obs);
    expect(proba.length).toBe(obs.length);
    for (const row of proba) {
      const s = row.reduce((a, b) => a + b, 0);
      expect(s).toBeCloseTo(1, 4);
      for (const p of row) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  it("sample returns correct length", () => {
    const obs = [0.1, 0.2, 5.0, 5.1, 0.05, 5.2];
    const model = new GaussianHMM({ nComponents: 2, nIter: 50 });
    model.fit(obs);
    const { states, obs: sampledObs } = model.sample(20);
    expect(states.length).toBe(20);
    expect(sampledObs.length).toBe(20);
    for (const s of states) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2);
    }
  });

  it("throws before fit", () => {
    const model = new GaussianHMM({ nComponents: 2 });
    expect(() => model.predict([1, 2])).toThrow("not fitted");
    expect(() => model.score([1, 2])).toThrow("not fitted");
  });

  it("throws on too short sequence", () => {
    const model = new GaussianHMM({ nComponents: 2 });
    expect(() => model.fit([1])).toThrow();
  });

  it("startProb rows sum to 1", () => {
    const obs = [0, 1, 0, 1, 2, 2, 0, 1].map((x) => x * 3.0);
    const model = new GaussianHMM({ nComponents: 3, nIter: 50 });
    const fit = model.fit(obs);
    const s = fit.startProb.reduce((a, b) => a + b, 0);
    expect(s).toBeCloseTo(1, 5);
    for (const row of fit.transmat) {
      const rs = row.reduce((a, b) => a + b, 0);
      expect(rs).toBeCloseTo(1, 5);
    }
  });

  it("fitGaussianHMM convenience function works", () => {
    const obs = [0.1, 0.2, 5.0, 5.1, 0.0];
    const model = fitGaussianHMM(obs, 2);
    expect(model.means.length).toBe(2);
  });

  it("property: log-prob is always finite for sane data", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }), {
          minLength: 10,
          maxLength: 50,
        }),
        (rawObs) => {
          const model = new GaussianHMM({ nComponents: 2, nIter: 20 });
          model.fit(rawObs);
          const lp = model.score(rawObs);
          return Number.isFinite(lp);
        },
      ),
      { numRuns: 20 },
    );
  });
});

// ─── MultinomialHMM ───────────────────────────────────────────────────────────

describe("MultinomialHMM", () => {
  it("fits a 2-state model on discrete data", () => {
    // State 0: emits 0 often; State 1: emits 1 often
    const obs: number[] = [];
    for (let i = 0; i < 60; i++) {
      obs.push(i % 6 < 4 ? 0 : 1);
    }

    const model = new MultinomialHMM({ nComponents: 2, nFeatures: 2, nIter: 200 });
    const fit = model.fit(obs);

    expect(fit.emissionProb.length).toBe(2);
    expect(fit.emissionProb[0]?.length).toBe(2);
    expect(fit.logProb).toBeLessThan(0);
    expect(fit.nIterDone).toBeGreaterThan(0);
  });

  it("predict returns valid state sequence", () => {
    const obs = [0, 0, 1, 1, 0, 0, 1, 1, 0, 1];
    const model = new MultinomialHMM({ nComponents: 2, nFeatures: 2, nIter: 100 });
    model.fit(obs);
    const states = model.predict(obs);
    expect(states.length).toBe(obs.length);
    for (const s of states) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(2);
    }
  });

  it("score returns finite log-prob", () => {
    const obs = [0, 1, 2, 0, 1, 2, 0, 1];
    const model = new MultinomialHMM({ nComponents: 2, nFeatures: 3, nIter: 100 });
    model.fit(obs);
    const lp = model.score(obs);
    expect(Number.isFinite(lp)).toBe(true);
    expect(lp).toBeLessThan(0);
  });

  it("emission probs sum to 1 per state", () => {
    const obs = [0, 1, 0, 2, 1, 0, 2, 1, 0];
    const model = new MultinomialHMM({ nComponents: 2, nFeatures: 3, nIter: 50 });
    const fit = model.fit(obs);
    for (const row of fit.emissionProb) {
      const s = row.reduce((a, b) => a + b, 0);
      expect(s).toBeCloseTo(1, 5);
    }
  });

  it("transition rows sum to 1", () => {
    const obs = [0, 0, 1, 1, 0, 0, 1, 1];
    const model = new MultinomialHMM({ nComponents: 2, nFeatures: 2, nIter: 50 });
    const fit = model.fit(obs);
    for (const row of fit.transmat) {
      const s = row.reduce((a, b) => a + b, 0);
      expect(s).toBeCloseTo(1, 5);
    }
  });

  it("throws before fit", () => {
    const model = new MultinomialHMM({ nComponents: 2, nFeatures: 3 });
    expect(() => model.predict([0, 1])).toThrow("not fitted");
  });
});

// ─── hmmViterbi standalone ────────────────────────────────────────────────────

describe("hmmViterbi", () => {
  it("decodes a simple 2-state chain correctly", () => {
    // State 0 emits symbol 0; State 1 emits symbol 1
    const startProb = [0.6, 0.4];
    const transmat = [
      [0.7, 0.3],
      [0.3, 0.7],
    ];
    const emissionProb = [
      [0.9, 0.1],
      [0.1, 0.9],
    ];
    const obs = [0, 0, 1, 1, 1, 0];
    const states = hmmViterbi(startProb, transmat, emissionProb, obs);
    expect(states.length).toBe(obs.length);
    // Should mostly decode 0→0,0→0,1→1,1→1,1→1,0→0
    expect(states[0]).toBe(0);
    expect(states[2]).toBe(1);
    expect(states[4]).toBe(1);
    expect(states[5]).toBe(0);
  });

  it("property: always returns valid state indices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 5, max: 20 }),
        (K, V, T) => {
          // Random row-stochastic matrices
          const startProb = Array.from({ length: K }, () => Math.random() + 0.1);
          const sp = startProb.reduce((a, b) => a + b, 0);
          const normStart = startProb.map((v) => v / sp);

          const transmat = Array.from({ length: K }, () => {
            const row = Array.from({ length: K }, () => Math.random() + 0.1);
            const rs = row.reduce((a, b) => a + b, 0);
            return row.map((v) => v / rs);
          });

          const emissionProb = Array.from({ length: K }, () => {
            const row = Array.from({ length: V }, () => Math.random() + 0.1);
            const rs = row.reduce((a, b) => a + b, 0);
            return row.map((v) => v / rs);
          });

          const obs = Array.from({ length: T }, () => Math.floor(Math.random() * V));
          const states = hmmViterbi(normStart, transmat, emissionProb, obs);

          return states.length === T && states.every((s) => s >= 0 && s < K);
        },
      ),
      { numRuns: 50 },
    );
  });
});
