/**
 * signal — Signal processing: FFT, windows, STFT, Welch PSD, periodogram.
 *
 * Mirrors `numpy.fft`, `scipy.signal` spectral and window utilities.
 * Implemented from scratch with no external dependencies.
 *
 * FFT:
 * - {@link fft}         — N-point complex DFT (radix-2, pads to power of 2)
 * - {@link ifft}        — inverse FFT
 * - {@link rfft}        — real-input FFT (one-sided)
 * - {@link irfft}       — inverse real FFT
 * - {@link fftFreq}     — DFT sample frequencies
 * - {@link rfftFreq}    — one-sided DFT sample frequencies
 * - {@link fftshift}    — shift zero-frequency to centre
 * - {@link ifftshift}   — inverse of fftshift
 *
 * Windows (via {@link getWindow}):
 * - `"rectangular"`, `"bartlett"`, `"hann"`, `"hamming"`, `"blackman"`,
 *   `"blackmanharris"`, `"flattop"`, `"kaiser"`
 *
 * Spectral analysis:
 * - {@link stft}        — Short-Time Fourier Transform
 * - {@link istft}       — Inverse STFT (overlap-add)
 * - {@link welch}       — Welch power spectral density
 * - {@link periodogram} — Periodogram PSD estimate
 *
 * @example
 * ```ts
 * import { fft, rfftFreq, welch } from "tsb";
 *
 * const x = [1, 0, -1, 0, 1, 0, -1, 0];
 * const X = fft(x);   // 8-point FFT
 * const freqs = rfftFreq(X.length, 1 / 100);
 *
 * const { f, Pxx } = welch(x, { fs: 100 });
 * ```
 *
 * @module
 */

// ─── complex arithmetic ───────────────────────────────────────────────────────

/** A complex number `{ re, im }`. */
export type Complex = { re: number; im: number };

/** Construct a complex number. */
export function complex(re: number, im: number): Complex {
  return { re, im };
}

/** Add two complex numbers. */
function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

/** Subtract two complex numbers. */
function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im };
}

/** Multiply two complex numbers. */
function cMul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

/** Complex conjugate. */
function cConj(a: Complex): Complex {
  return { re: a.re, im: -a.im };
}

/** Magnitude squared |a|². */
function cAbsSq(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

/** Magnitude |a|. */
export function cAbs(a: Complex): number {
  return Math.sqrt(cAbsSq(a));
}

/** Phase angle (arg) of a complex number. */
export function cArg(a: Complex): number {
  return Math.atan2(a.im, a.re);
}

// ─── FFT internals ────────────────────────────────────────────────────────────

/** Smallest power of 2 ≥ n. */
function nextPow2(n: number): number {
  if (n <= 1) {
    return 1;
  }
  let p = 1;
  while (p < n) {
    p <<= 1;
  }
  return p;
}

/** In-place bit-reversal permutation. */
function bitReverse(arr: Complex[], n: number): void {
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
  }
}

/** Cooley-Tukey radix-2 DIT iterative FFT, in-place. `n` must be a power of 2. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: nested FFT butterfly loops
function fftInPlace(arr: Complex[], n: number, inverse: boolean): void {
  bitReverse(arr, n);
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wLen: Complex = { re: Math.cos(ang), im: Math.sin(ang) };
    for (let i = 0; i < n; i += len) {
      let w: Complex = { re: 1, im: 0 };
      for (let j = 0; j < half; j++) {
        const u = arr[i + j]!;
        const v = cMul(arr[i + j + half]!, w);
        arr[i + j] = cAdd(u, v);
        arr[i + j + half] = cSub(u, v);
        w = cMul(w, wLen);
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      const a = arr[i]!;
      arr[i] = { re: a.re / n, im: a.im / n };
    }
  }
}

// ─── public FFT functions ─────────────────────────────────────────────────────

/**
 * Compute the discrete Fourier transform of a real signal.
 *
 * If `x.length` is not a power of 2, the signal is zero-padded to the next
 * power of 2. The returned array has length `nextPow2(x.length)`.
 *
 * @param x - Input signal (real values).
 * @returns Complex DFT coefficients.
 */
export function fft(x: readonly number[]): Complex[] {
  const n = x.length;
  const m = nextPow2(n);
  const buf: Complex[] = Array.from({ length: m }, (_, i) => ({
    re: x[i] ?? 0,
    im: 0,
  }));
  fftInPlace(buf, m, false);
  return buf;
}

/**
 * Compute the inverse discrete Fourier transform.
 *
 * The length of `X` must be a power of 2. Returns a complex array of the
 * same length as `X`.
 *
 * @param X - Complex DFT coefficients.
 * @returns Complex inverse-DFT output.
 */
export function ifft(X: readonly Complex[]): Complex[] {
  const n = X.length;
  const m = nextPow2(n);
  const buf: Complex[] = Array.from({ length: m }, (_, i) => {
    const c = X[i] ?? { re: 0, im: 0 };
    return { re: c.re, im: c.im };
  });
  fftInPlace(buf, m, true);
  return buf;
}

/**
 * Real-input FFT (one-sided). Returns the first `floor(m/2) + 1` bins where
 * `m = nextPow2(x.length)`.
 *
 * @param x - Real input signal.
 * @returns One-sided complex spectrum.
 */
export function rfft(x: readonly number[]): Complex[] {
  const full = fft(x);
  return full.slice(0, Math.floor(full.length / 2) + 1);
}

/**
 * Inverse real FFT. Reconstructs a real signal from one-sided spectrum.
 *
 * @param X - One-sided spectrum as from {@link rfft}.
 * @param n - Optional output length (defaults to `2 * (X.length - 1)`).
 * @returns Real signal.
 */
export function irfft(X: readonly Complex[], n?: number): number[] {
  const nOut = n ?? 2 * (X.length - 1);
  const m = nextPow2(nOut);
  const buf: Complex[] = new Array(m);
  const half = X.length;
  for (let i = 0; i < half; i++) {
    buf[i] = { re: (X[i] ?? { re: 0, im: 0 }).re, im: (X[i] ?? { re: 0, im: 0 }).im };
  }
  for (let i = half; i < m; i++) {
    const j = m - i;
    const c = X[j] ?? { re: 0, im: 0 };
    buf[i] = cConj(c);
  }
  fftInPlace(buf, m, true);
  return Array.from({ length: nOut }, (_, i) => buf[i]?.re ?? 0);
}

/**
 * DFT sample frequencies for an `n`-point FFT with sample spacing `d`.
 *
 * @param n - FFT length (from `fft(x).length`).
 * @param d - Sample spacing in seconds (default `1`).
 * @returns Array of frequencies from `0` to `(n-1)/(n*d)`, wrapped to negative.
 */
export function fftFreq(n: number, d = 1): number[] {
  const f: number[] = new Array(n);
  const half = Math.floor(n / 2) + 1;
  for (let i = 0; i < half; i++) {
    f[i] = i / (n * d);
  }
  for (let i = half; i < n; i++) {
    f[i] = (i - n) / (n * d);
  }
  return f;
}

/**
 * One-sided DFT sample frequencies for a real-input FFT.
 *
 * @param n - FFT length (from `rfft(x).length` etc.).
 * @param d - Sample spacing in seconds (default `1`).
 * @returns Frequencies `[0, 1/(n*d), 2/(n*d), ..., 1/(2*d)]`.
 */
export function rfftFreq(n: number, d = 1): number[] {
  const half = Math.floor(n / 2) + 1;
  return Array.from({ length: half }, (_, i) => i / (n * d));
}

/**
 * Shift the zero-frequency component to the centre of the spectrum.
 * Equivalent to `numpy.fft.fftshift`.
 */
export function fftshift<T>(x: readonly T[]): T[] {
  const n = x.length;
  const half = Math.floor(n / 2);
  return [...x.slice(half), ...x.slice(0, half)];
}

/**
 * Inverse of {@link fftshift}. Equivalent to `numpy.fft.ifftshift`.
 */
export function ifftshift<T>(x: readonly T[]): T[] {
  const n = x.length;
  const half = Math.ceil(n / 2);
  return [...x.slice(half), ...x.slice(0, half)];
}

// ─── window functions ─────────────────────────────────────────────────────────

/** Supported window names. */
export type WindowName =
  | "rectangular"
  | "bartlett"
  | "hann"
  | "hamming"
  | "blackman"
  | "blackmanharris"
  | "flattop"
  | "kaiser";

/** Modified Bessel function of the first kind, order 0, I₀(x). (A&S 9.8.1) */
function besselI0(x: number): number {
  const ax = Math.abs(x);
  if (ax < 3.75) {
    const t = (x / 3.75) ** 2;
    return (
      1 +
      t *
        (3.5156229 +
          t * (3.0899424 + t * (1.2067492 + t * (0.2659732 + t * (0.0360768 + t * 0.0045813)))))
    );
  }
  const t = 3.75 / ax;
  return (
    (Math.exp(ax) / Math.sqrt(ax)) *
    (0.39894228 +
      t *
        (0.01328592 +
          t *
            (0.00225319 +
              t *
                (-0.00157565 +
                  t *
                    (0.00916281 +
                      t * (-0.02057706 + t * (0.02635537 + t * (-0.01647633 + t * 0.00392377))))))))
  );
}

/** Rectangular (boxcar) window — all ones. */
export function rectangularWindow(n: number): number[] {
  return Array.from({ length: n }, () => 1);
}

/** Bartlett (triangular) window. */
export function bartlettWindow(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 1 - Math.abs((2 * i - (n - 1)) / (n - 1)));
}

/** Hann window — `0.5 * (1 - cos(2πi/(N-1)))`. */
export function hannWindow(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1))));
}

/** Hamming window — `0.54 - 0.46 * cos(2πi/(N-1))`. */
export function hammingWindow(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
}

/** Blackman window. */
export function blackmanWindow(n: number): number[] {
  return Array.from(
    { length: n },
    (_, i) =>
      0.42 -
      0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) +
      0.08 * Math.cos((4 * Math.PI * i) / (n - 1)),
  );
}

/** Blackman-Harris window (4-term). */
export function blackmanHarrisWindow(n: number): number[] {
  const a0 = 0.35875;
  const a1 = 0.48829;
  const a2 = 0.14128;
  const a3 = 0.01168;
  return Array.from(
    { length: n },
    (_, i) =>
      a0 -
      a1 * Math.cos((2 * Math.PI * i) / (n - 1)) +
      a2 * Math.cos((4 * Math.PI * i) / (n - 1)) -
      a3 * Math.cos((6 * Math.PI * i) / (n - 1)),
  );
}

/** Flat-top window (5-term). */
export function flatTopWindow(n: number): number[] {
  const a0 = 0.21557895;
  const a1 = 0.41663158;
  const a2 = 0.277263158;
  const a3 = 0.083578947;
  const a4 = 0.006947368;
  return Array.from(
    { length: n },
    (_, i) =>
      a0 -
      a1 * Math.cos((2 * Math.PI * i) / (n - 1)) +
      a2 * Math.cos((4 * Math.PI * i) / (n - 1)) -
      a3 * Math.cos((6 * Math.PI * i) / (n - 1)) +
      a4 * Math.cos((8 * Math.PI * i) / (n - 1)),
  );
}

/**
 * Kaiser window with shape parameter `beta`.
 *
 * @param n    - Number of samples.
 * @param beta - Shape parameter (controls main-lobe width vs side-lobe level).
 */
export function kaiserWindow(n: number, beta: number): number[] {
  const i0b = besselI0(beta);
  return Array.from({ length: n }, (_, i) => {
    const t = (2 * i) / (n - 1) - 1;
    return besselI0(beta * Math.sqrt(1 - t * t)) / i0b;
  });
}

/**
 * Create a window of length `n` by name.
 *
 * @param name  - Window function name.
 * @param n     - Number of samples.
 * @param beta  - Kaiser window `beta` parameter (ignored for other windows).
 * @returns     - Window samples.
 */
export function getWindow(name: WindowName, n: number, beta = 14): number[] {
  switch (name) {
    case "rectangular":
      return rectangularWindow(n);
    case "bartlett":
      return bartlettWindow(n);
    case "hann":
      return hannWindow(n);
    case "hamming":
      return hammingWindow(n);
    case "blackman":
      return blackmanWindow(n);
    case "blackmanharris":
      return blackmanHarrisWindow(n);
    case "flattop":
      return flatTopWindow(n);
    case "kaiser":
      return kaiserWindow(n, beta);
  }
}

// ─── STFT / ISTFT ─────────────────────────────────────────────────────────────

/** Options for {@link stft}. */
export interface STFTOptions {
  /** Sampling frequency in Hz (default `1`). */
  fs?: number;
  /** Segment length in samples (default `256`). */
  nperseg?: number;
  /** Number of samples to overlap between segments (default `nperseg / 2`). */
  noverlap?: number;
  /** FFT length ≥ `nperseg` (default = `nperseg`, padded to power of 2). */
  nfft?: number;
  /** Window function to apply (default `"hann"`). */
  window?: WindowName | readonly number[];
  /** Boundary extension mode: `"zeros"` pads with zeros, `null` no padding. */
  boundary?: "zeros" | null;
}

/** STFT result object. */
export interface STFTResult {
  /** Time centres for each frame (seconds). */
  t: number[];
  /** Frequency bins (Hz). */
  f: number[];
  /** Complex STFT matrix `Zxx[freqIdx][timeIdx]`. */
  Zxx: Complex[][];
}

/**
 * Short-Time Fourier Transform.
 *
 * Mirrors `scipy.signal.stft`. Splits the signal into overlapping windowed
 * segments and computes the FFT of each segment.
 *
 * @param x       - Input signal.
 * @param options - {@link STFTOptions}.
 * @returns       - {@link STFTResult} with `{ t, f, Zxx }`.
 *
 * @example
 * ```ts
 * import { stft } from "tsb";
 * const x = Array.from({ length: 1024 }, (_, i) => Math.sin(2 * Math.PI * 10 * i / 512));
 * const { t, f, Zxx } = stft(x, { fs: 512, nperseg: 128 });
 * ```
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: STFT nested loops
export function stft(x: readonly number[], options: STFTOptions = {}): STFTResult {
  const fs = options.fs ?? 1;
  const nperseg = options.nperseg ?? Math.min(256, x.length);
  const noverlap = options.noverlap ?? Math.floor(nperseg / 2);
  const nfft = nextPow2(options.nfft ?? nperseg);
  const step = nperseg - noverlap;
  const boundary = options.boundary ?? "zeros";

  // Build window
  const win: number[] =
    options.window !== undefined
      ? typeof options.window === "string"
        ? getWindow(options.window, nperseg)
        : Array.from(options.window)
      : hannWindow(nperseg);

  // Pad signal at boundaries
  const pad = boundary === "zeros" ? Math.floor(nperseg / 2) : 0;
  const padded: number[] = [
    ...Array.from<number>({ length: pad }).fill(0),
    ...x,
    ...Array.from<number>({ length: pad }).fill(0),
  ];

  // Number of frames
  const nFrames = Math.floor((padded.length - noverlap) / step);
  const nFreqs = Math.floor(nfft / 2) + 1;

  const Zxx: Complex[][] = Array.from({ length: nFreqs }, () => new Array<Complex>(nFrames));
  const tArr: number[] = new Array(nFrames);
  const fArr: number[] = Array.from({ length: nFreqs }, (_, i) => (i * fs) / nfft);

  for (let k = 0; k < nFrames; k++) {
    const start = k * step;
    const seg: Complex[] = Array.from({ length: nfft }, (_, i) => ({
      re: (padded[start + i] ?? 0) * (win[i] ?? 1),
      im: 0,
    }));
    fftInPlace(seg, nfft, false);
    for (let fi = 0; fi < nFreqs; fi++) {
      const col = Zxx[fi];
      if (col !== undefined) {
        col[k] = seg[fi] ?? { re: 0, im: 0 };
      }
    }
    tArr[k] = (start + nperseg / 2 - pad) / fs;
  }

  return { t: tArr, f: fArr, Zxx };
}

/** Options for {@link istft}. */
export interface ISTFTOptions {
  /** Segment length in samples (used to determine overlap). */
  nperseg?: number;
  /** Number of samples to overlap between segments (default `nperseg / 2`). */
  noverlap?: number;
  /** FFT length (default = `2 * (nFreqs - 1)` where `nFreqs = Zxx.length`). */
  nfft?: number;
  /** Window function (default `"hann"`). */
  window?: WindowName | readonly number[];
  /** Boundary extension used in stft (default `"zeros"`). */
  boundary?: "zeros" | null;
}

/**
 * Inverse Short-Time Fourier Transform (overlap-add).
 *
 * Mirrors `scipy.signal.istft`.
 *
 * @param Zxx     - Complex STFT matrix `[freqIdx][timeIdx]` (from {@link stft}).
 * @param options - {@link ISTFTOptions}.
 * @returns       - Reconstructed real signal.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ISTFT overlap-add loops
export function istft(Zxx: readonly (readonly Complex[])[], options: ISTFTOptions = {}): number[] {
  const nFreqs = Zxx.length;
  const nFrames = nFreqs > 0 ? (Zxx[0]?.length ?? 0) : 0;
  const nfft = options.nfft ?? 2 * (nFreqs - 1);
  const nperseg = options.nperseg ?? nfft;
  const noverlap = options.noverlap ?? Math.floor(nperseg / 2);
  const step = nperseg - noverlap;

  const win: number[] =
    options.window !== undefined
      ? typeof options.window === "string"
        ? getWindow(options.window, nperseg)
        : Array.from(options.window)
      : hannWindow(nperseg);

  const boundary = options.boundary ?? "zeros";
  const pad = boundary === "zeros" ? Math.floor(nperseg / 2) : 0;
  const outLen = nFrames * step + nperseg;

  const output = new Float64Array(outLen);
  const windowSum = new Float64Array(outLen);
  const winSq = win.map((w) => w * w);

  for (let k = 0; k < nFrames; k++) {
    // Build full-spectrum (two-sided) for IFFT
    const buf: Complex[] = new Array(nfft);
    for (let fi = 0; fi < nFreqs; fi++) {
      buf[fi] = Zxx[fi]?.[k] ?? { re: 0, im: 0 };
    }
    for (let fi = nFreqs; fi < nfft; fi++) {
      const mirrorIdx = nfft - fi;
      const src = Zxx[mirrorIdx]?.[k] ?? { re: 0, im: 0 };
      buf[fi] = cConj(src);
    }
    fftInPlace(buf, nfft, true);

    const start = k * step;
    for (let i = 0; i < nperseg; i++) {
      const idx = start + i;
      output[idx] = (output[idx] ?? 0) + (buf[i]?.re ?? 0) * (win[i] ?? 1);
      windowSum[idx] = (windowSum[idx] ?? 0) + (winSq[i] ?? 0);
    }
  }

  // Normalize and trim boundary padding
  const result: number[] = [];
  const start = pad;
  const end = outLen - pad;
  for (let i = start; i < end; i++) {
    const ws = windowSum[i] ?? 0;
    result.push(ws > 1e-10 ? (output[i] ?? 0) / ws : 0);
  }

  return result;
}

// ─── Welch PSD ────────────────────────────────────────────────────────────────

/** Options for {@link welch}. */
export interface WelchOptions {
  /** Sampling frequency in Hz (default `1`). */
  fs?: number;
  /** Segment length (default `min(256, x.length)`). */
  nperseg?: number;
  /** Overlap between segments (default `nperseg / 2`). */
  noverlap?: number;
  /** FFT length (default `nperseg`, padded to power of 2). */
  nfft?: number;
  /** Window function (default `"hann"`). */
  window?: WindowName | readonly number[];
  /** Averaging method: `"mean"` (default) or `"median"`. */
  average?: "mean" | "median";
  /** Scaling: `"density"` (PSD, V²/Hz) or `"spectrum"` (power spectrum V²). */
  scaling?: "density" | "spectrum";
}

/** PSD result: frequency bins and power spectral density estimates. */
export interface PSDResult {
  /** Frequency bins in Hz. */
  f: number[];
  /** Power spectral density (or power spectrum) at each frequency. */
  Pxx: number[];
}

/**
 * Welch power spectral density estimate.
 *
 * Divides the signal into overlapping segments, computes the periodogram for
 * each, and averages. Mirrors `scipy.signal.welch`.
 *
 * @param x       - Input signal.
 * @param options - {@link WelchOptions}.
 * @returns       - {@link PSDResult} `{ f, Pxx }`.
 *
 * @example
 * ```ts
 * import { welch } from "tsb";
 * const x = Array.from({ length: 512 }, (_, i) => Math.sin(2 * Math.PI * 60 * i / 512));
 * const { f, Pxx } = welch(x, { fs: 512 });
 * ```
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Welch averaging loop
export function welch(x: readonly number[], options: WelchOptions = {}): PSDResult {
  const fs = options.fs ?? 1;
  const nperseg = options.nperseg ?? Math.min(256, x.length);
  const noverlap = options.noverlap ?? Math.floor(nperseg / 2);
  const nfft = nextPow2(options.nfft ?? nperseg);
  const step = nperseg - noverlap;
  const average = options.average ?? "mean";
  const scaling = options.scaling ?? "density";

  const win: number[] =
    options.window !== undefined
      ? typeof options.window === "string"
        ? getWindow(options.window, nperseg)
        : Array.from(options.window)
      : hannWindow(nperseg);

  const winNorm =
    scaling === "density"
      ? win.reduce((s, w) => s + w * w, 0) * fs
      : win.reduce((s, w) => s + w * w, 0);
  const nFreqs = Math.floor(nfft / 2) + 1;
  const nFrames = Math.floor((x.length - noverlap) / step);

  if (nFrames <= 0) {
    // Signal too short — return single periodogram
    return periodogram(x, {
      fs,
      scaling,
      ...(options.nfft !== undefined ? { nfft: options.nfft } : {}),
      ...(options.window !== undefined ? { window: options.window } : {}),
    });
  }

  // Collect per-frame periodograms
  const frames: number[][] = [];
  for (let k = 0; k < nFrames; k++) {
    const start = k * step;
    const seg: Complex[] = Array.from({ length: nfft }, (_, i) => ({
      re: (x[start + i] ?? 0) * (win[i] ?? 0),
      im: 0,
    }));
    fftInPlace(seg, nfft, false);
    const pxx: number[] = Array.from({ length: nFreqs }, (_, fi) => {
      const c = seg[fi] ?? { re: 0, im: 0 };
      let p = cAbsSq(c) / winNorm;
      // Double one-sided bins (except DC and Nyquist)
      if (fi > 0 && fi < nFreqs - 1) {
        p *= 2;
      }
      return p;
    });
    frames.push(pxx);
  }

  // Average
  const Pxx: number[] = Array.from({ length: nFreqs }, (_, fi) => {
    const vals = frames.map((fr) => fr[fi] ?? 0);
    if (average === "mean") {
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    }
    // median
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
      ? (sorted[mid] ?? 0)
      : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  });

  const f: number[] = Array.from({ length: nFreqs }, (_, i) => (i * fs) / nfft);
  return { f, Pxx };
}

// ─── Periodogram ──────────────────────────────────────────────────────────────

/** Options for {@link periodogram}. */
export interface PeriodogramOptions {
  /** Sampling frequency in Hz (default `1`). */
  fs?: number;
  /** FFT length (default `nextPow2(x.length)`). */
  nfft?: number;
  /** Window function (default `"hann"`). */
  window?: WindowName | readonly number[];
  /** Scaling: `"density"` (PSD) or `"spectrum"` (power spectrum). */
  scaling?: "density" | "spectrum";
}

/**
 * Estimate power spectral density via a single FFT (periodogram).
 *
 * Mirrors `scipy.signal.periodogram`.
 *
 * @param x       - Input signal.
 * @param options - {@link PeriodogramOptions}.
 * @returns       - {@link PSDResult} `{ f, Pxx }`.
 *
 * @example
 * ```ts
 * import { periodogram } from "tsb";
 * const x = Array.from({ length: 256 }, (_, i) => Math.cos(2 * Math.PI * 20 * i / 256));
 * const { f, Pxx } = periodogram(x, { fs: 256 });
 * ```
 */
export function periodogram(x: readonly number[], options: PeriodogramOptions = {}): PSDResult {
  const fs = options.fs ?? 1;
  const nfft = nextPow2(options.nfft ?? x.length);
  const scaling = options.scaling ?? "density";

  const win: number[] =
    options.window !== undefined
      ? typeof options.window === "string"
        ? getWindow(options.window, x.length)
        : Array.from(options.window)
      : hannWindow(x.length);

  const winNorm =
    scaling === "density"
      ? win.reduce((s, w) => s + w * w, 0) * fs
      : win.reduce((s, w) => s + w * w, 0);

  const seg: Complex[] = Array.from({ length: nfft }, (_, i) => ({
    re: (x[i] ?? 0) * (win[i] ?? 0),
    im: 0,
  }));
  fftInPlace(seg, nfft, false);

  const nFreqs = Math.floor(nfft / 2) + 1;
  const f: number[] = Array.from({ length: nFreqs }, (_, i) => (i * fs) / nfft);
  const Pxx: number[] = Array.from({ length: nFreqs }, (_, fi) => {
    const c = seg[fi] ?? { re: 0, im: 0 };
    let p = cAbsSq(c) / winNorm;
    if (fi > 0 && fi < nFreqs - 1) {
      p *= 2;
    }
    return p;
  });

  return { f, Pxx };
}
