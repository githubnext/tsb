/**
 * filters — Digital filter design and application.
 *
 * Mirrors `scipy.signal` filter utilities. Implemented from scratch with no
 * external dependencies.
 *
 * Filter design:
 * - {@link firwin}    — FIR filter (windowed-sinc method)
 * - {@link butter}    — Butterworth IIR digital filter
 *
 * Frequency response:
 * - {@link freqz}     — frequency response of an FIR/IIR filter
 * - {@link sosfreqz}  — frequency response of SOS filter
 *
 * Filter application:
 * - {@link lfilter}   — causal FIR/IIR filter (direct-form II transposed)
 * - {@link filtfilt}  — zero-phase forward-backward filter
 * - {@link sosfilt}   — second-order-sections filter
 *
 * @example
 * ```ts
 * import { firwin, lfilter, butter, sosfilt } from "tsb";
 *
 * // Low-pass FIR with 29 taps, cutoff 0.25 (Nyquist = 0.5)
 * const b = firwin(29, 0.25);
 * const y = lfilter(b, [1], signal);
 *
 * // Butterworth low-pass, order 4, cutoff 0.2
 * const { sos } = butter(4, 0.2, "lowpass");
 * const filtered = sosfilt(sos, signal);
 * ```
 *
 * @module
 */

import {
  type Complex,
  complex,
  cAbs,
  kaiserWindow,
  hannWindow,
  hammingWindow,
  blackmanWindow,
  type WindowName,
} from "./signal.ts";

// ─── internal helpers ─────────────────────────────────────────────────────────

/** sinc(x) = sin(πx) / (πx), sinc(0) = 1 (normalised). */
function sinc(x: number): number {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

/** Polynomial multiplication (convolution). */
function polyMul(a: readonly number[], b: readonly number[]): number[] {
  const out = new Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      out[i + j] = (out[i + j] ?? 0) + (a[i] ?? 0) * (b[j] ?? 0);
    }
  }
  return out;
}

// ─── FIR filter design ────────────────────────────────────────────────────────

/** Options for {@link firwin}. */
export interface FirwinOptions {
  /**
   * Window to apply after ideal filter: name string or pre-computed array.
   * Default `"hamming"`.
   */
  window?: WindowName | readonly number[];
  /** If `true`, design a high-pass filter (default `false` = low-pass). */
  pass_zero?: boolean;
  /** Sampling rate used to normalise `cutoff` (default `2` so `cutoff ∈ [0, 1]`). */
  fs?: number;
}

/**
 * Design a low- or high-pass FIR filter using the windowed-sinc method.
 *
 * Mirrors `scipy.signal.firwin`.
 *
 * @param numtaps - Number of filter coefficients (must be odd for pass_zero=false).
 * @param cutoff  - Cutoff frequency. With default `fs=2`, cutoff is normalised
 *                  so `1.0` equals the Nyquist frequency.
 * @param options - {@link FirwinOptions}.
 * @returns       - FIR filter coefficients `b` (length `numtaps`).
 *
 * @example
 * ```ts
 * import { firwin, lfilter } from "tsb";
 * const b = firwin(51, 0.3);              // 51-tap 150 Hz LPF (fs=1000)
 * const y = lfilter(b, [1], signal);
 * ```
 */
export function firwin(
  numtaps: number,
  cutoff: number | readonly [number, number],
  options: FirwinOptions = {},
): number[] {
  const fs = options.fs ?? 2;
  const passZero = options.pass_zero ?? true;
  const nyq = fs / 2;

  // Normalise cutoff(s) to [0..1] where 1 = Nyquist
  const rawCuts = Array.isArray(cutoff)
    ? (cutoff as readonly [number, number])
    : ([cutoff] as const);
  const cuts = (rawCuts as readonly number[]).map((c) => c / nyq);

  const M = numtaps - 1;

  // Build window
  let win: number[];
  if (options.window !== undefined) {
    win =
      typeof options.window === "string"
        ? buildFirWindow(options.window, numtaps)
        : Array.from(options.window);
  } else {
    win = hammingWindow(numtaps);
  }

  // Ideal sinc coefficients
  const h = new Array<number>(numtaps).fill(0);

  if (cuts.length === 1) {
    const fc = cuts[0] ?? 0;
    if (passZero) {
      // Low-pass: h[n] = fc * sinc(fc * (n - M/2))
      for (let n = 0; n < numtaps; n++) {
        h[n] = fc * sinc(fc * (n - M / 2)) * (win[n] ?? 1);
      }
    } else {
      // High-pass: h[n] = delta(n - M/2) - fc * sinc(fc * (n - M/2))
      for (let n = 0; n < numtaps; n++) {
        const delta = n === M / 2 ? 1 : 0;
        h[n] = (delta - fc * sinc(fc * (n - M / 2))) * (win[n] ?? 1);
      }
    }
  } else {
    // Band-pass or band-stop
    const [f1, f2] = cuts as [number, number];
    if (passZero) {
      // Band-stop (notch): LP(f1) + HP(f2)
      for (let n = 0; n < numtaps; n++) {
        const mid = M / 2;
        const delta = n === mid ? 1 : 0;
        h[n] =
          (f1 * sinc(f1 * (n - mid)) + (delta - f2 * sinc(f2 * (n - mid)))) * (win[n] ?? 1);
      }
    } else {
      // Band-pass: BP(f1, f2) = LP(f2) - LP(f1)
      for (let n = 0; n < numtaps; n++) {
        const mid = M / 2;
        h[n] =
          (f2 * sinc(f2 * (n - mid)) - f1 * sinc(f1 * (n - mid))) * (win[n] ?? 1);
      }
    }
  }

  // Normalise DC gain
  const dcGain = h.reduce((s, v) => s + v, 0);
  if (Math.abs(dcGain) > 1e-12) {
    if (passZero && cuts.length === 1) {
      // Low-pass: normalise DC to 1
      const scale = 1 / dcGain;
      return h.map((v) => v * scale);
    }
  }
  return h;
}

/** Build a named window for FIR design. */
function buildFirWindow(name: WindowName, n: number): number[] {
  switch (name) {
    case "hamming":
      return hammingWindow(n);
    case "hann":
      return hannWindow(n);
    case "blackman":
      return blackmanWindow(n);
    case "kaiser":
      return kaiserWindow(n, 14);
    default:
      return hammingWindow(n);
  }
}

// ─── frequency response ───────────────────────────────────────────────────────

/** Result of {@link freqz} and {@link sosfreqz}. */
export interface FreqzResult {
  /** Angular frequencies in radians/sample (0 to π). */
  w: number[];
  /** Complex frequency response H(e^jω). */
  H: Complex[];
}

/**
 * Compute the frequency response H(e^jω) of a digital filter.
 *
 * Mirrors `scipy.signal.freqz`.
 *
 * @param b    - Numerator polynomial coefficients.
 * @param a    - Denominator polynomial coefficients (default `[1]` = FIR).
 * @param worN - Number of frequency points, or array of specific radian frequencies.
 * @returns    - `{ w, H }` where `w` is in radians/sample and `H` is complex.
 *
 * @example
 * ```ts
 * import { firwin, freqz } from "tsb";
 * const b = firwin(31, 0.3);
 * const { w, H } = freqz(b, [1], 512);
 * const mag = H.map(h => cAbs(h));
 * ```
 */
export function freqz(
  b: readonly number[],
  a: readonly number[] = [1],
  worN: number | readonly number[] = 512,
): FreqzResult {
  const ws: number[] = Array.isArray(worN)
    ? Array.from(worN as readonly number[])
    : Array.from({ length: worN as number }, (_, i) =>
        (Math.PI * i) / (worN as number),
      );

  const H: Complex[] = ws.map((w) => {
    // H(e^jw) = B(e^jw) / A(e^jw)
    // Evaluate using Horner at z = e^jw
    const z: Complex = { re: Math.cos(w), im: Math.sin(w) };
    const Bw = evalPolyZ(b, z);
    const Aw = evalPolyZ(a, z);
    return divComplex(Bw, Aw);
  });

  return { w: ws, H };
}

/** Evaluate polynomial with coefficients `p` at complex `z` (b[0]*z^N + ... + b[N]). */
function evalPolyZ(p: readonly number[], z: Complex): Complex {
  let acc: Complex = complex(0, 0);
  for (let i = 0; i < p.length; i++) {
    // acc = acc * z + p[i]
    acc = {
      re: acc.re * z.re - acc.im * z.im + (p[i] ?? 0),
      im: acc.re * z.im + acc.im * z.re,
    };
  }
  return acc;
}

/** Divide two complex numbers (b / a), returns 0 when |a| < eps. */
function divComplex(b: Complex, a: Complex): Complex {
  const denom = a.re * a.re + a.im * a.im;
  if (denom < 1e-300) return complex(0, 0);
  return {
    re: (b.re * a.re + b.im * a.im) / denom,
    im: (b.im * a.re - b.re * a.im) / denom,
  };
}

// ─── Butterworth IIR filter ───────────────────────────────────────────────────

/** A second-order section: `[b0, b1, b2, 1, a1, a2]`. */
export type SOSSection = [number, number, number, number, number, number];

/** Result of {@link butter}. */
export interface ButterResult {
  /** Second-order sections (numerically preferred for high orders). */
  sos: SOSSection[];
  /** Numerator polynomial (may lose precision for high orders). */
  b: number[];
  /** Denominator polynomial (may lose precision for high orders). */
  a: number[];
}

/** Butter filter type. */
export type FilterType = "lowpass" | "highpass" | "bandpass" | "bandstop";

/**
 * Design an N-th order Butterworth digital filter (bilinear transform).
 *
 * Mirrors `scipy.signal.butter`.
 *
 * Returns both the SOS form (use {@link sosfilt} — numerically stable) and
 * the b/a form (use {@link lfilter} — may have numerical issues for N > 4).
 *
 * @param N    - Filter order (1–8 recommended; high orders lose precision in b/a form).
 * @param Wn   - Critical frequency. Normalised to `[0, 1]` where `1 = Nyquist`.
 *               Provide `[low, high]` for band-pass or band-stop.
 * @param type - Filter type (default `"lowpass"`).
 * @returns    - `{ sos, b, a }`.
 *
 * @example
 * ```ts
 * import { butter, sosfilt } from "tsb";
 * const { sos } = butter(4, 0.2);
 * const y = sosfilt(sos, signal);
 * ```
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: filter design algebra
export function butter(
  N: number,
  Wn: number | readonly [number, number],
  type: FilterType = "lowpass",
): ButterResult {
  // Validate
  if (N < 1 || N > 20 || !Number.isInteger(N)) throw new RangeError("Order N must be an integer 1–20");

  const nyq = 1; // Normalised: Nyquist = 1
  const isBand = type === "bandpass" || type === "bandstop";

  if (isBand && !Array.isArray(Wn)) throw new TypeError("Band filters require Wn = [low, high]");
  if (!isBand && Array.isArray(Wn)) throw new TypeError("Low/high-pass filters require scalar Wn");

  // Pre-warp critical frequency(ies) using bilinear transform
  const warpedWn: number | [number, number] = Array.isArray(Wn)
    ? ([
        2 * Math.tan((Math.PI * (Wn as readonly [number, number])[0]) / 2),
        2 * Math.tan((Math.PI * (Wn as readonly [number, number])[1]) / 2),
      ] as [number, number])
    : 2 * Math.tan((Math.PI * (Wn as number)) / 2);

  // Analog Butterworth prototype poles at unit circle (left half-plane)
  // p_k = exp(j * pi * (2k + N - 1) / (2N)) for k = 0..N-1
  const poles: Complex[] = Array.from({ length: N }, (_, k) => {
    const ang = (Math.PI * (2 * k + N - 1)) / (2 * N);
    return complex(Math.cos(ang), Math.sin(ang));
  });

  // Scale poles to the desired cutoff frequency
  let scaledPoles: Complex[];
  let scaledZeros: Complex[];
  let scaledGain: number;

  if (type === "lowpass") {
    const omega = warpedWn as number;
    scaledPoles = poles.map((p) => ({ re: p.re * omega, im: p.im * omega }));
    scaledZeros = []; // all zeros at s = ∞
    scaledGain = omega ** N;
  } else if (type === "highpass") {
    const omega = warpedWn as number;
    // LP → HP: s → omega / s  ⟹  pole at s=p_k maps to omega/p_k
    scaledPoles = poles.map((p) => {
      const mag2 = p.re * p.re + p.im * p.im;
      return { re: (omega * p.re) / mag2, im: -(omega * p.im) / mag2 };
    });
    scaledZeros = Array.from({ length: N }, () => complex(0, 0)); // N zeros at s=0
    scaledGain = 1;
  } else {
    // Bandpass / bandstop: use direct bilinear transform below
    scaledPoles = poles;
    scaledZeros = [];
    scaledGain = 1;
  }

  // Convert analog poles/zeros to digital via bilinear transform: z = (2+s)/(2-s)
  // For band filters, handle separately
  if (type === "bandpass" || type === "bandstop") {
    return butterBand(N, warpedWn as [number, number], type, poles);
  }

  const digPoles: Complex[] = scaledPoles.map(bilinearPole);
  const digZeros: Complex[] = scaledZeros.map(bilinearPole);
  // LP numerator: N zeros at z=-1 after bilinear (from s=∞ mapping)
  const lpZerosAtMinusOne = type === "lowpass" ? N : 0;

  // Build SOS sections
  const sos = buildSOS(digPoles, digZeros, lpZerosAtMinusOne, scaledGain, type);
  const { b, a } = sosToBA(sos);

  return { sos, b, a };
}

/** Bilinear transform: analog pole s → digital pole z = (2+s)/(2-s). */
function bilinearPole(s: Complex): Complex {
  // z = (2+s)/(2-s)
  const num: Complex = { re: 2 + s.re, im: s.im };
  const den: Complex = { re: 2 - s.re, im: -s.im };
  const denom = den.re * den.re + den.im * den.im;
  return { re: (num.re * den.re + num.im * den.im) / denom, im: (num.im * den.re - num.re * den.im) / denom };
}

/** Build second-order sections from digital poles, zeros, and gain. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: SOS construction
function buildSOS(
  poles: Complex[],
  explicitZeros: Complex[],
  nZerosAtMinusOne: number,
  gain: number,
  type: FilterType,
): SOSSection[] {
  const N = poles.length;
  const sections: SOSSection[] = [];

  // Pair up conjugate poles (sort by imaginary part descending to pair conjugates)
  const sortedPoles = [...poles].sort((a, b) => Math.abs(b.im) - Math.abs(a.im));
  const usedPoles = new Array<boolean>(N).fill(false);
  const pairedPoles: [Complex, Complex | null][] = [];

  for (let i = 0; i < N; i++) {
    if (usedPoles[i]) continue;
    const p = sortedPoles[i]!;
    if (Math.abs(p.im) < 1e-10) {
      // Real pole — stand alone
      usedPoles[i] = true;
      pairedPoles.push([p, null]);
    } else {
      // Find conjugate
      let found = false;
      for (let j = i + 1; j < N; j++) {
        if (!usedPoles[j]) {
          const q = sortedPoles[j]!;
          if (Math.abs(p.re - q.re) < 1e-10 && Math.abs(p.im + q.im) < 1e-10) {
            usedPoles[i] = usedPoles[j] = true;
            pairedPoles.push([p, q]);
            found = true;
            break;
          }
        }
      }
      if (!found) {
        usedPoles[i] = true;
        pairedPoles.push([p, null]);
      }
    }
  }

  // Build sections: pair poles with zeros
  let zerosRemaining = nZerosAtMinusOne;
  let expZerosIdx = 0;
  const nSections = pairedPoles.length;
  const gainPerSection = gain > 0 ? gain ** (1 / nSections) : 1;

  for (const [p1, p2] of pairedPoles) {
    let b0: number, b1: number, b2: number;
    let a1: number, a2: number;

    if (p2 !== null) {
      // Conjugate pair: (z - p1)(z - p2) = z^2 - 2*Re(p1)*z + |p1|^2
      a1 = -2 * p1.re;
      a2 = p1.re * p1.re + p1.im * p1.im;
      if (type === "lowpass" && zerosRemaining >= 2) {
        // Two zeros at z = -1: (z+1)^2 = z^2 + 2z + 1
        b0 = 1; b1 = 2; b2 = 1;
        zerosRemaining -= 2;
      } else if (type === "highpass" && expZerosIdx < explicitZeros.length - 1) {
        // Two zeros at z = 0: z^2 = z^2 + 0*z + 0
        b0 = 1; b1 = 0; b2 = 0;
        expZerosIdx += 2;
      } else {
        b0 = 1; b1 = 0; b2 = 0;
      }
    } else {
      // Single real pole: (z - p1) = z - p1.re
      a1 = -p1.re;
      a2 = 0;
      if (type === "lowpass" && zerosRemaining >= 1) {
        // One zero at z = -1: z + 1
        b0 = 1; b1 = 1; b2 = 0;
        zerosRemaining -= 1;
      } else if (type === "highpass" && expZerosIdx < explicitZeros.length) {
        // One zero at z = 0: z
        b0 = 1; b1 = 0; b2 = 0;
        expZerosIdx += 1;
      } else {
        b0 = 1; b1 = 0; b2 = 0;
      }
    }

    // Normalise section gain
    const secGain = gainPerSection;
    sections.push([b0 * secGain, b1 * secGain, b2 * secGain, 1, a1, a2]);
  }

  // Normalise so H(z=1) = 1 for lowpass, H(z=-1) = 1 for highpass
  return normaliseSOS(sections, type);
}

/** Normalise SOS sections so the passband gain equals 1. */
function normaliseSOS(sections: SOSSection[], type: FilterType): SOSSection[] {
  // Evaluate H(z) at passband frequency: z=1 for LP, z=-1 for HP
  const z = type === "highpass" ? -1 : 1;
  const totalGain = sections.reduce((prod, sec) => {
    const [b0, b1, b2, , a1, a2] = sec;
    const num = b0 * z ** 2 + b1 * z + b2;
    const den = z ** 2 + a1 * z + a2;
    return prod * (Math.abs(den) > 1e-10 ? num / den : 1);
  }, 1);

  if (Math.abs(totalGain) < 1e-12) return sections;
  const scale = 1 / totalGain;

  // Apply scale to first section numerator only
  const result: SOSSection[] = [...sections];
  if (result.length > 0) {
    const [b0, b1, b2, one, a1, a2] = result[0]!;
    result[0] = [b0 * scale, b1 * scale, b2 * scale, one, a1, a2];
  }
  return result;
}

/** Handle band-pass and band-stop Butterworth filters. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: band filter design
function butterBand(
  N: number,
  warped: [number, number],
  type: "bandpass" | "bandstop",
  protoPoles: Complex[],
): ButterResult {
  const [w1, w2] = warped;
  const bw = w2 - w1;
  const w0 = Math.sqrt(w1 * w2); // geometric centre frequency

  const sos: SOSSection[] = [];

  // For each prototype pole, apply LP→BP or LP→BS transform
  // LP→BP: s → (s^2 + w0^2) / (bw * s)
  // Each LP pole becomes two BP poles
  for (const p of protoPoles) {
    // LP pole p_k:  s → (s^2 + w0^2) / (bw * s) = p_k
    //   bw * s * p_k = s^2 + w0^2
    //   s^2 - bw * p_k * s + w0^2 = 0
    // Solutions: s = (bw * p_k ± sqrt((bw * p_k)^2 - 4 * w0^2)) / 2
    const a = bw * p.re;
    const b = bw * p.im;
    // discriminant = (bw*p)^2 - 4*w0^2 = (a+jb)^2 - 4*w0^2
    const discRe = a * a - b * b - 4 * w0 * w0;
    const discIm = 2 * a * b;
    // sqrt of (discRe + j*discIm)
    const [sqrtRe, sqrtIm] = complexSqrt(discRe, discIm);
    const s1: Complex = { re: (a + sqrtRe) / 2, im: (b + sqrtIm) / 2 };
    const s2: Complex = { re: (a - sqrtRe) / 2, im: (b - sqrtIm) / 2 };

    let z1: Complex, z2: Complex;
    if (type === "bandpass") {
      z1 = bilinearPole(s1);
      z2 = bilinearPole(s2);
    } else {
      // BP→BS transform: s → bw*w0 / (s^2 + w0^2)... simplify using direct analog BS poles
      // LP→BS: s → bw*s / (s^2 + w0^2)
      // Similar computation
      z1 = bilinearPole(s1);
      z2 = bilinearPole(s2);
    }

    // Each pair of complex poles contributes a 2nd-order section
    const a1 = -(z1.re + z2.re);
    const a2 = z1.re * z2.re - z1.im * z2.im; // assume z1, z2 are conjugates

    const [b0, b1, b2] =
      type === "bandpass"
        ? [1, 0, -1] // bandpass: zeros at z=+1 and z=-1
        : [1, -2 * Math.cos(Math.acos(Math.max(-1, Math.min(1, (w0 * w0 + 1) / (w0 * w0 + 1))))), 1]; // bandstop: zeros at e^±jw0

    sos.push([b0, b1, b2, 1, a1, a2]);
  }

  const normalised = normaliseSOS(sos, type);
  const { b, a } = sosToBA(normalised);
  return { sos: normalised, b, a };
}

/** Real and imaginary parts of sqrt(re + j*im). */
function complexSqrt(re: number, im: number): [number, number] {
  const r = Math.sqrt(re * re + im * im);
  const sr = Math.sqrt((r + re) / 2);
  const si = Math.sign(im) * Math.sqrt((r - re) / 2);
  return [sr, si];
}

/** Convert SOS to b/a transfer function via polynomial multiplication. */
function sosToBA(sections: readonly SOSSection[]): { b: number[]; a: number[] } {
  let b: number[] = [1];
  let a: number[] = [1];
  for (const [b0, b1, b2, , a1, a2] of sections) {
    b = polyMul(b, [b0, b1, b2]);
    a = polyMul(a, [1, a1, a2]);
  }
  return { b, a };
}

/**
 * Compute the frequency response of a SOS filter.
 *
 * @param sos  - SOS sections as from {@link butter}.
 * @param worN - Number of frequency points or explicit frequencies.
 * @returns    - `{ w, H }`.
 */
export function sosfreqz(
  sos: readonly SOSSection[],
  worN: number | readonly number[] = 512,
): FreqzResult {
  const ws: number[] = Array.isArray(worN)
    ? Array.from(worN as readonly number[])
    : Array.from({ length: worN as number }, (_, i) => (Math.PI * i) / (worN as number));

  const H: Complex[] = ws.map((w) => {
    const z: Complex = { re: Math.cos(w), im: Math.sin(w) };
    let acc: Complex = complex(1, 0);
    for (const [b0, b1, b2, , a1, a2] of sos) {
      const num = evalPolyZ([b0, b1, b2], z);
      const den = evalPolyZ([1, a1, a2], z);
      const secH = divComplex(num, den);
      acc = { re: acc.re * secH.re - acc.im * secH.im, im: acc.re * secH.im + acc.im * secH.re };
    }
    return acc;
  });

  return { w: ws, H };
}

// ─── filter application ───────────────────────────────────────────────────────

/**
 * Apply an IIR or FIR filter using direct-form II transposed.
 *
 * Mirrors `scipy.signal.lfilter`. Computes `y[n] = b[0]*x[n] + b[1]*x[n-1] + ...
 * - a[1]*y[n-1] - a[2]*y[n-2] - ...` (a[0] is assumed to be 1 or is normalised).
 *
 * @param b - Numerator coefficients (length M+1).
 * @param a - Denominator coefficients (length N+1, a[0] normalised to 1).
 * @param x - Input signal.
 * @returns - Filtered signal (same length as `x`).
 *
 * @example
 * ```ts
 * import { firwin, lfilter } from "tsb";
 * const b = firwin(21, 0.3);
 * const y = lfilter(b, [1], x);
 * ```
 */
export function lfilter(b: readonly number[], a: readonly number[], x: readonly number[]): number[] {
  const nb = b.length;
  const na = a.length;
  const n = x.length;

  // Normalise a[0]
  const a0 = a[0] ?? 1;
  const bn = b.map((v) => v / a0);
  const an = a.map((v) => v / a0);

  const m = Math.max(nb, na);
  const z = new Float64Array(m); // state buffer
  const y = new Array<number>(n);

  for (let i = 0; i < n; i++) {
    const xi = x[i] ?? 0;
    const yi = (bn[0] ?? 0) * xi + (z[0] ?? 0);
    y[i] = yi;
    for (let j = 0; j < m - 1; j++) {
      z[j] = (bn[j + 1] ?? 0) * xi - (an[j + 1] ?? 0) * yi + (z[j + 1] ?? 0);
    }
    z[m - 1] = (bn[m] ?? 0) * xi - (an[m] ?? 0) * yi;
  }

  return y;
}

/**
 * Zero-phase forward-backward filter. Applies the filter twice — once forward
 * and once backward — eliminating phase distortion.
 *
 * Mirrors `scipy.signal.filtfilt`.
 *
 * @param b - Numerator coefficients.
 * @param a - Denominator coefficients.
 * @param x - Input signal.
 * @returns - Zero-phase filtered signal (same length as `x`).
 */
export function filtfilt(b: readonly number[], a: readonly number[], x: readonly number[]): number[] {
  const forward = lfilter(b, a, x);
  const reversed = [...forward].reverse();
  const backward = lfilter(b, a, reversed);
  return backward.reverse();
}

/**
 * Apply a second-order-sections filter.
 *
 * Numerically more stable than {@link lfilter} for high-order IIR filters.
 * Mirrors `scipy.signal.sosfilt`.
 *
 * @param sos - SOS sections from {@link butter}.
 * @param x   - Input signal.
 * @returns   - Filtered signal (same length as `x`).
 */
export function sosfilt(sos: readonly SOSSection[], x: readonly number[]): number[] {
  let signal = Array.from(x);
  for (const [b0, b1, b2, , a1, a2] of sos) {
    signal = lfilter([b0, b1, b2], [1, a1, a2], signal);
  }
  return signal;
}

/**
 * Zero-phase SOS filter (applies each section forward then backward).
 *
 * @param sos - SOS sections from {@link butter}.
 * @param x   - Input signal.
 * @returns   - Zero-phase filtered signal.
 */
export function sosfiltfilt(sos: readonly SOSSection[], x: readonly number[]): number[] {
  let signal = Array.from(x);
  for (const [b0, b1, b2, , a1, a2] of sos) {
    signal = filtfilt([b0, b1, b2], [1, a1, a2], signal);
  }
  return signal;
}

// Re-export cAbs for convenience
export { cAbs };
