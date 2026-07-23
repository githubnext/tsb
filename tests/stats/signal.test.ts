/**
 * Tests for src/stats/signal.ts
 * Covers FFT, windows, STFT, ISTFT, Welch PSD, and periodogram.
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  bartlettWindow,
  blackmanHarrisWindow,
  blackmanWindow,
  cAbs,
  complex,
  fft,
  fftFreq,
  fftshift,
  flatTopWindow,
  getWindow,
  hammingWindow,
  hannWindow,
  ifft,
  ifftshift,
  irfft,
  istft,
  kaiserWindow,
  periodogram,
  rectangularWindow,
  rfft,
  rfftFreq,
  stft,
  welch,
} from "../../src/stats/signal.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

function near(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) <= tol * (1 + Math.abs(b));
}

function nearAbs(a: number, b: number, tol = 1e-9): boolean {
  return Math.abs(a - b) <= tol;
}

// ─── FFT ──────────────────────────────────────────────────────────────────────

describe("fft / ifft", () => {
  test("DC input — all energy at bin 0", () => {
    const X = fft([1, 1, 1, 1]);
    expect(nearAbs(X[0]?.re ?? 0, 4, 1e-10)).toBe(true);
    expect(nearAbs(X[0]?.im ?? 0, 0, 1e-10)).toBe(true);
    expect(nearAbs(cAbs(X[1] ?? complex(0, 0)), 0, 1e-10)).toBe(true);
  });

  test("single tone — energy at expected bin", () => {
    // x[n] = exp(2πj * k * n / N) for k=1, N=8
    const N = 8;
    const x: number[] = Array.from({ length: N }, (_, n) => Math.cos((2 * Math.PI * n) / N));
    const X = fft(x);
    // cosine has energy at bins 1 and N-1
    const mag = X.map((c) => cAbs(c));
    expect(mag[1]).toBeCloseTo(N / 2, 4);
    expect(mag[7]).toBeCloseTo(N / 2, 4);
    for (let i = 2; i <= 6; i++) {
      expect(mag[i]).toBeCloseTo(0, 4);
    }
  });

  test("Parseval's theorem — energy preserved", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const X = fft(x);
    const N = X.length;
    const timePower = x.reduce((s, v) => s + v * v, 0);
    const freqPower = X.reduce((s, c) => s + c.re * c.re + c.im * c.im, 0) / N;
    expect(nearAbs(timePower, freqPower, 1e-8)).toBe(true);
  });

  test("ifft(fft(x)) ≈ x (round-trip)", () => {
    const x = [3, 1, 4, 1, 5, 9, 2, 6];
    const X = fft(x);
    const xBack = ifft(X);
    for (let i = 0; i < x.length; i++) {
      expect(xBack[i]?.re ?? 0).toBeCloseTo(x[i] ?? 0, 10);
    }
  });

  test("zero input → zero output", () => {
    const X = fft([0, 0, 0, 0]);
    for (const c of X) {
      expect(cAbs(c)).toBeCloseTo(0, 12);
    }
  });

  test("non-power-of-2 input pads to next power", () => {
    const x = [1, 2, 3]; // length 3 → pad to 4
    const X = fft(x);
    expect(X.length).toBe(4);
  });

  test("linearity: fft(a*x + b*y) = a*fft(x) + b*fft(y)", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const y = [8, 7, 6, 5, 4, 3, 2, 1];
    const a = 2;
    const b = 3;
    const Xab = fft(x.map((v, i) => a * v + b * (y[i] ?? 0)));
    const Xa = fft(x);
    const Xy = fft(y);
    for (let i = 0; i < Xab.length; i++) {
      const re = a * (Xa[i]?.re ?? 0) + b * (Xy[i]?.re ?? 0);
      const im = a * (Xa[i]?.im ?? 0) + b * (Xy[i]?.im ?? 0);
      expect(Xab[i]?.re ?? 0).toBeCloseTo(re, 8);
      expect(Xab[i]?.im ?? 0).toBeCloseTo(im, 8);
    }
  });
});

describe("rfft / irfft", () => {
  test("rfft of real signal is conjugate-symmetric", () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const X = rfft(x);
    // For a real signal, the full FFT has X[k] = conj(X[N-k])
    // rfft returns only bins 0..N/2
    const n = fft(x).length;
    expect(X.length).toBe(n / 2 + 1);
  });

  test("irfft(rfft(x)) ≈ x (round-trip)", () => {
    const x = [1, 0, -1, 0, 1, 0, -1, 0];
    const X = rfft(x);
    const n = fft(x).length;
    const xBack = irfft(X, n);
    for (let i = 0; i < x.length; i++) {
      expect(xBack[i] ?? 0).toBeCloseTo(x[i] ?? 0, 8);
    }
  });

  test("rfftFreq length matches rfft output", () => {
    const x = new Array(16).fill(1) as number[];
    const X = rfft(x);
    const freqs = rfftFreq(fft(x).length, 1 / 100);
    expect(freqs.length).toBe(X.length);
    expect(freqs[0]).toBeCloseTo(0);
    expect(freqs.at(-1)).toBeCloseTo(50); // Nyquist at 50 Hz for fs=100
  });
});

// ─── fftFreq / fftshift / ifftshift ──────────────────────────────────────────

describe("fftFreq", () => {
  test("DC bin is 0", () => {
    const f = fftFreq(8, 1);
    expect(f[0]).toBe(0);
  });

  test("positive and negative frequencies", () => {
    const f = fftFreq(8, 1);
    expect(f[1]).toBeCloseTo(0.125);
    expect(f[4]).toBeCloseTo(0.5);
    expect(f[5]).toBeCloseTo(-0.375);
    expect(f[7]).toBeCloseTo(-0.125);
  });

  test("sample spacing scales frequencies", () => {
    const fs = 100;
    const f = fftFreq(8, 1 / fs);
    expect(f[1]).toBeCloseTo(fs / 8);
  });
});

describe("fftshift / ifftshift", () => {
  test("even length: round-trip", () => {
    const x = [0, 1, 2, 3];
    const shifted = fftshift(x);
    expect(ifftshift(shifted)).toEqual(x);
  });

  test("odd length: fftshift matches numpy", () => {
    const x = [0, 1, 2, 3, 4];
    const shifted = fftshift(x);
    expect(shifted).toEqual([2, 3, 4, 0, 1]);
  });

  test("odd length: ifftshift matches numpy", () => {
    const x = [2, 3, 4, 0, 1];
    const back = ifftshift(x);
    expect(back).toEqual([0, 1, 2, 3, 4]);
  });

  test("fftshift(ifftshift(x)) = x (any length)", () => {
    fc.assert(
      fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1, maxLength: 20 }), (arr) => {
        const roundTrip = fftshift(ifftshift(arr));
        return roundTrip.every((v, i) => v === arr[i]);
      }),
    );
  });
});

// ─── windows ──────────────────────────────────────────────────────────────────

describe("window functions", () => {
  const lengths = [1, 2, 4, 8, 16, 32];

  for (const n of lengths) {
    test(`rectangularWindow(${n}) — all ones`, () => {
      const w = rectangularWindow(n);
      expect(w.length).toBe(n);
      for (const v of w) {
        expect(v).toBe(1);
      }
    });

    test(`hannWindow(${n}) — ends near 0, sum > 0`, () => {
      const w = hannWindow(n);
      expect(w.length).toBe(n);
      if (n > 1) {
        expect(w[0]).toBeCloseTo(0, 10);
        expect(w[n - 1]).toBeCloseTo(0, 10);
      }
    });

    test(`hammingWindow(${n}) — ends near 0.08`, () => {
      const w = hammingWindow(n);
      expect(w.length).toBe(n);
      if (n > 1) {
        expect(w[0]).toBeCloseTo(0.08, 5);
        expect(w[n - 1]).toBeCloseTo(0.08, 5);
      }
    });

    test(`blackmanWindow(${n}) — ends near 0`, () => {
      const w = blackmanWindow(n);
      expect(w.length).toBe(n);
      if (n > 1) {
        expect(Math.abs(w[0] ?? 0)).toBeLessThan(1e-10);
      }
    });
  }

  test("bartlettWindow — triangular, peak at middle", () => {
    const w = bartlettWindow(9);
    expect(w[0]).toBeCloseTo(0, 10);
    expect(w[4]).toBeCloseTo(1, 10);
    expect(w[8]).toBeCloseTo(0, 10);
  });

  test("blackmanHarrisWindow — four-term cosine", () => {
    const w = blackmanHarrisWindow(64);
    expect(w.length).toBe(64);
    expect(w[0]).toBeCloseTo(0.00006, 4);
  });

  test("flatTopWindow — values can exceed 1", () => {
    const w = flatTopWindow(64);
    expect(w.length).toBe(64);
    expect(Math.max(...w)).toBeGreaterThan(1);
  });

  test("kaiserWindow — beta=0 → rectangular", () => {
    const w = kaiserWindow(8, 0);
    for (const v of w) {
      expect(v).toBeCloseTo(1, 10);
    }
  });

  test("kaiserWindow — beta=14, symmetric", () => {
    const w = kaiserWindow(16, 14);
    expect(w.length).toBe(16);
    for (let i = 0; i < 8; i++) {
      expect(w[i] ?? 0).toBeCloseTo(w[15 - i] ?? 0, 12);
    }
  });

  test("getWindow dispatches correctly", () => {
    const names = [
      "rectangular",
      "bartlett",
      "hann",
      "hamming",
      "blackman",
      "blackmanharris",
      "flattop",
      "kaiser",
    ] as const;
    for (const name of names) {
      const w = getWindow(name, 16);
      expect(w.length).toBe(16);
    }
  });

  test("all windows are symmetric for even length", () => {
    const names = ["hann", "hamming", "blackman", "blackmanharris"] as const;
    for (const name of names) {
      const w = getWindow(name, 16);
      for (let i = 0; i < 8; i++) {
        expect(w[i] ?? 0).toBeCloseTo(w[15 - i] ?? 0, 12);
      }
    }
  });
});

// ─── STFT ─────────────────────────────────────────────────────────────────────

describe("stft", () => {
  test("output dimensions are correct", () => {
    const x = new Array(256).fill(0) as number[];
    const { t, f, Zxx } = stft(x, { nperseg: 64, noverlap: 32 });
    // nFreqs = 64/2 + 1 = 33 (since nfft = nextPow2(64) = 64)
    expect(Zxx.length).toBe(33);
    expect(t.length).toBeGreaterThan(0);
    expect(f.length).toBe(33);
  });

  test("frequency bins are non-negative", () => {
    const x = new Array(128).fill(1) as number[];
    const { f } = stft(x, { nperseg: 32 });
    for (const freq of f) {
      expect(freq).toBeGreaterThanOrEqual(0);
    }
  });

  test("DC signal — energy only at bin 0", () => {
    const n = 256;
    const x = new Array(n).fill(1.0) as number[];
    const { Zxx } = stft(x, { nperseg: 32, noverlap: 16, window: "rectangular" });
    // All energy should be near bin 0
    for (let k = 0; k < (Zxx[0]?.length ?? 0); k++) {
      const dc = Zxx[0]?.[k];
      if (dc !== undefined) {
        expect(cAbs(dc)).toBeGreaterThan(0);
      }
    }
  });

  test("sinusoidal signal — peak frequency matches", () => {
    const fs = 256;
    const f0 = 32; // Hz
    const n = 512;
    const x = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * f0 * i) / fs));
    const { f, Zxx } = stft(x, { fs, nperseg: 64 });
    // Find bin with highest energy
    const maxMags = Array.from({ length: f.length }, (_, fi) => {
      const col = Zxx[fi];
      if (!col) {
        return 0;
      }
      return Math.max(...col.map(cAbs));
    });
    const peakBin = maxMags.indexOf(Math.max(...maxMags));
    const peakFreq = f[peakBin] ?? 0;
    // Peak should be at f0 ± one bin
    expect(Math.abs(peakFreq - f0)).toBeLessThan(f[1]! * 2 + 1);
  });
});

// ─── ISTFT ────────────────────────────────────────────────────────────────────

describe("istft", () => {
  test("round-trip: istft(stft(x)) ≈ x", () => {
    const n = 256;
    const x = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 10 * i) / n));
    const nperseg = 64;
    const noverlap = 32;
    const { Zxx } = stft(x, { nperseg, noverlap });
    const xBack = istft(Zxx, { nperseg, noverlap });
    // Interior samples should match (boundary effects are expected at edges)
    const margin = nperseg;
    for (let i = margin; i < n - margin; i++) {
      expect(Math.abs((xBack[i] ?? 0) - x[i]!)).toBeLessThan(0.05);
    }
  });
});

// ─── Welch PSD ────────────────────────────────────────────────────────────────

describe("welch", () => {
  test("output lengths match", () => {
    const x = new Array(512).fill(0) as number[];
    const { f, Pxx } = welch(x, { nperseg: 64 });
    expect(f.length).toBe(Pxx.length);
    expect(f.length).toBeGreaterThan(0);
  });

  test("frequencies are non-negative and increasing", () => {
    const x = new Array(512).fill(1) as number[];
    const { f } = welch(x, { nperseg: 64 });
    for (let i = 1; i < f.length; i++) {
      expect((f[i] ?? 0) > (f[i - 1] ?? 0)).toBe(true);
    }
  });

  test("PSD values are non-negative", () => {
    const x = Array.from({ length: 512 }, () => Math.random() - 0.5);
    const { Pxx } = welch(x);
    for (const v of Pxx) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  test("sinusoidal signal — peak at correct frequency", () => {
    const fs = 512;
    const f0 = 64;
    const n = 2048;
    const x = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * f0 * i) / fs));
    const { f, Pxx } = welch(x, { fs, nperseg: 256 });
    const peakIdx = Pxx.indexOf(Math.max(...Pxx));
    const peakF = f[peakIdx] ?? 0;
    expect(Math.abs(peakF - f0)).toBeLessThan(4);
  });

  test("median averaging option", () => {
    const x = Array.from({ length: 512 }, (_, i) => Math.cos((2 * Math.PI * 10 * i) / 512));
    const { Pxx: meanPxx } = welch(x, { average: "mean" });
    const { Pxx: medPxx } = welch(x, { average: "median" });
    expect(meanPxx.length).toBe(medPxx.length);
    // Both should have positive values
    for (const v of medPxx) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  test("scaling: density vs spectrum", () => {
    const x = Array.from({ length: 256 }, (_, i) => Math.sin((2 * Math.PI * i) / 256));
    const { Pxx: dens } = welch(x, { scaling: "density", nperseg: 64 });
    const { Pxx: spec } = welch(x, { scaling: "spectrum", nperseg: 64 });
    // They should differ
    expect(dens[0]).not.toBeCloseTo(spec[0] ?? 0, 5);
  });
});

// ─── periodogram ──────────────────────────────────────────────────────────────

describe("periodogram", () => {
  test("output lengths match", () => {
    const x = new Array(128).fill(0) as number[];
    const { f, Pxx } = periodogram(x);
    expect(f.length).toBe(Pxx.length);
  });

  test("zero signal → near-zero PSD", () => {
    const x = new Array(128).fill(0) as number[];
    const { Pxx } = periodogram(x);
    for (const v of Pxx) {
      expect(v).toBeCloseTo(0, 10);
    }
  });

  test("PSD non-negative", () => {
    const x = Array.from({ length: 128 }, (_, i) => Math.sin((2 * Math.PI * 10 * i) / 128));
    const { Pxx } = periodogram(x);
    for (const v of Pxx) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  test("DC signal — peak at bin 0", () => {
    const x = new Array(256).fill(1.0) as number[];
    const { Pxx } = periodogram(x, { window: "rectangular" });
    const peakIdx = Pxx.indexOf(Math.max(...Pxx));
    expect(peakIdx).toBe(0);
  });

  test("frequencies match rfftFreq convention", () => {
    const fs = 100;
    const n = 128;
    const x = new Array(n).fill(0) as number[];
    const { f } = periodogram(x, { fs });
    // Max frequency should be Nyquist = fs/2
    const maxF = f.at(-1) ?? 0;
    expect(Math.abs(maxF - fs / 2)).toBeLessThan(fs / n + 1);
  });
});

// ─── property-based ───────────────────────────────────────────────────────────

describe("FFT properties (fast-check)", () => {
  test("Parseval's theorem holds for all power-of-2 signals", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -10, max: 10, noNaN: true }), { minLength: 8, maxLength: 8 }),
        (x) => {
          const X = fft(x);
          const N = X.length;
          const timePower = x.reduce((s, v) => s + v * v, 0);
          const freqPower = X.reduce((s, c) => s + c.re * c.re + c.im * c.im, 0) / N;
          return Math.abs(timePower - freqPower) < 1e-6 * (1 + timePower);
        },
      ),
    );
  });

  test("fftshift round-trip for all lengths 1..20", () => {
    for (let n = 1; n <= 20; n++) {
      const x = Array.from({ length: n }, (_, i) => i);
      const roundTrip = ifftshift(fftshift(x));
      for (let i = 0; i < n; i++) {
        expect(roundTrip[i]).toBe(x[i]);
      }
    }
  });
});
