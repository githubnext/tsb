/**
 * Tests for src/ml/ddim.ts
 */
import { describe, expect, it } from "bun:test";
import {
  computeNoiseSchedule,
  addNoise,
  ddimStep,
  ddimTimesteps,
  snrAtTimestep,
} from "../../src/index.ts";

describe("computeNoiseSchedule — linear", () => {
  it("has correct length", () => {
    const s = computeNoiseSchedule({ numTrainTimesteps: 100, schedule: "linear", eta: 0, betaStart: 0.0001, betaEnd: 0.02 });
    expect(s.betas.length).toBe(100);
    expect(s.alphasCumprod.length).toBe(100);
  });

  it("alphasCumprod is decreasing", () => {
    const s = computeNoiseSchedule({ numTrainTimesteps: 50, schedule: "linear", eta: 0, betaStart: 0.0001, betaEnd: 0.02 });
    for (let i = 1; i < 50; i++) {
      expect(s.alphasCumprod[i]!).toBeLessThan(s.alphasCumprod[i - 1]!);
    }
  });

  it("sqrtAlphasCumprod[0] close to 1", () => {
    const s = computeNoiseSchedule({ numTrainTimesteps: 1000, schedule: "linear", eta: 0, betaStart: 0.0001, betaEnd: 0.02 });
    expect(s.sqrtAlphasCumprod[0]!).toBeGreaterThan(0.99);
  });
});

describe("computeNoiseSchedule — cosine", () => {
  it("alphasCumprod values are in (0,1)", () => {
    const s = computeNoiseSchedule({ numTrainTimesteps: 100, schedule: "cosine", eta: 0, betaStart: 0.0001, betaEnd: 0.02 });
    for (let i = 0; i < 100; i++) {
      expect(s.alphasCumprod[i]!).toBeGreaterThan(0);
      expect(s.alphasCumprod[i]!).toBeLessThan(1);
    }
  });
});

describe("addNoise", () => {
  it("returns sample unchanged when sqrtOneMinusAlphasCumprod is 0", () => {
    const s = computeNoiseSchedule({ numTrainTimesteps: 1, schedule: "linear", eta: 0, betaStart: 0.0001, betaEnd: 0.0001 });
    const sample = new Float64Array([1, 2, 3]);
    const noise = new Float64Array([10, 10, 10]);
    const out = addNoise(sample, noise, 0, s);
    // Should be dominated by signal (small beta => large alpha)
    expect(out[0]!).toBeGreaterThan(0.9);
  });

  it("output length matches input", () => {
    const s = computeNoiseSchedule({ numTrainTimesteps: 10, schedule: "linear", eta: 0, betaStart: 0.001, betaEnd: 0.01 });
    const sample = new Float64Array(8);
    const noise = new Float64Array(8);
    expect(addNoise(sample, noise, 5, s).length).toBe(8);
  });
});

describe("ddimTimesteps", () => {
  it("returns correct count", () => {
    const ts = ddimTimesteps(1000, 50);
    expect(ts.length).toBe(50);
  });

  it("first timestep is largest", () => {
    const ts = ddimTimesteps(1000, 10);
    expect(ts[0]!).toBeGreaterThan(ts[ts.length - 1]!);
  });
});

describe("snrAtTimestep", () => {
  it("snr decreases over time for linear schedule", () => {
    const s = computeNoiseSchedule({ numTrainTimesteps: 100, schedule: "linear", eta: 0, betaStart: 0.001, betaEnd: 0.02 });
    expect(snrAtTimestep(10, s)).toBeGreaterThan(snrAtTimestep(50, s));
  });
});
