/*!
 * Scalar reduction accelerators for f64 arrays.
 *
 * All functions skip NaN values, matching the TypeScript `_numericValues()`
 * filter that Series.sum / Series.mean / etc. apply before reducing.
 *
 * Conventions:
 * - Empty or all-NaN input: sum → 0.0, mean/min/max/std/var/median → NaN.
 * - ddof is the delta degrees-of-freedom for variance/std (1 = sample).
 */

use wasm_bindgen::prelude::*;

// ─── helpers ─────────────────────────────────────────────────────────────────

/// Collect non-NaN values from `data` into a `Vec<f64>`.
fn valid(data: &[f64]) -> Vec<f64> {
    data.iter().filter(|v| !v.is_nan()).copied().collect()
}

// ─── public exports ───────────────────────────────────────────────────────────

/// Sum of non-NaN values. Returns `0.0` when there are no valid values,
/// matching `Series.sum()` on an all-null / empty series.
#[wasm_bindgen]
pub fn sum_f64(data: &[f64]) -> f64 {
    let mut acc = 0.0_f64;
    for &v in data {
        if !v.is_nan() {
            acc += v;
        }
    }
    acc
}

/// Arithmetic mean of non-NaN values. Returns `NaN` for empty / all-NaN input,
/// matching `Series.mean()`.
#[wasm_bindgen]
pub fn mean_f64(data: &[f64]) -> f64 {
    let mut acc = 0.0_f64;
    let mut count = 0_u64;
    for &v in data {
        if !v.is_nan() {
            acc += v;
            count += 1;
        }
    }
    if count == 0 {
        f64::NAN
    } else {
        acc / count as f64
    }
}

/// Minimum of non-NaN values. Returns `NaN` for empty / all-NaN input,
/// matching `Series.min()` returning `undefined` (coerced to NaN in numeric
/// contexts).
#[wasm_bindgen]
pub fn min_f64(data: &[f64]) -> f64 {
    let mut result = f64::NAN;
    for &v in data {
        if !v.is_nan() {
            if result.is_nan() || v < result {
                result = v;
            }
        }
    }
    result
}

/// Maximum of non-NaN values. Returns `NaN` for empty / all-NaN input.
#[wasm_bindgen]
pub fn max_f64(data: &[f64]) -> f64 {
    let mut result = f64::NAN;
    for &v in data {
        if !v.is_nan() {
            if result.is_nan() || v > result {
                result = v;
            }
        }
    }
    result
}

/// Sample variance of non-NaN values with delta degrees-of-freedom `ddof`.
/// Returns `NaN` when fewer than `ddof + 1` valid values exist, matching
/// `Series.var(ddof)`.
#[wasm_bindgen]
pub fn var_f64(data: &[f64], ddof: f64) -> f64 {
    let vals = valid(data);
    let n = vals.len() as f64;
    if n < ddof + 1.0 {
        return f64::NAN;
    }
    let mu = vals.iter().sum::<f64>() / n;
    let ss: f64 = vals.iter().map(|v| (v - mu) * (v - mu)).sum();
    ss / (n - ddof)
}

/// Sample standard deviation with delta degrees-of-freedom `ddof`.
/// Returns `NaN` when fewer than `ddof + 1` valid values exist.
#[wasm_bindgen]
pub fn std_f64(data: &[f64], ddof: f64) -> f64 {
    var_f64(data, ddof).sqrt()
}

/// Median of non-NaN values (middle value of sorted data; average of two
/// middle values for even-length arrays). Returns `NaN` for empty / all-NaN
/// input, matching `Series.median()`.
#[wasm_bindgen]
pub fn median_f64(data: &[f64]) -> f64 {
    let mut vals = valid(data);
    let n = vals.len();
    if n == 0 {
        return f64::NAN;
    }
    vals.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mid = n / 2;
    if n % 2 == 1 {
        vals[mid]
    } else {
        (vals[mid - 1] + vals[mid]) / 2.0
    }
}

// ─── unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_near(a: f64, b: f64) {
        if a.is_nan() && b.is_nan() {
            return;
        }
        assert!(
            (a - b).abs() < 1e-9,
            "expected {}, got {}",
            b,
            a
        );
    }

    #[test]
    fn test_sum_basic() {
        assert_near(sum_f64(&[1.0, 2.0, 3.0, 4.0]), 10.0);
    }

    #[test]
    fn test_sum_with_nan() {
        assert_near(sum_f64(&[1.0, f64::NAN, 3.0]), 4.0);
    }

    #[test]
    fn test_sum_empty() {
        assert_near(sum_f64(&[]), 0.0);
    }

    #[test]
    fn test_mean_basic() {
        assert_near(mean_f64(&[1.0, 2.0, 3.0]), 2.0);
    }

    #[test]
    fn test_mean_nan_skipped() {
        assert_near(mean_f64(&[1.0, f64::NAN, 3.0]), 2.0);
    }

    #[test]
    fn test_mean_empty() {
        assert!(mean_f64(&[]).is_nan());
    }

    #[test]
    fn test_min_basic() {
        assert_near(min_f64(&[3.0, 1.0, 4.0, 1.5]), 1.0);
    }

    #[test]
    fn test_min_nan_skipped() {
        assert_near(min_f64(&[f64::NAN, 2.0, f64::NAN]), 2.0);
    }

    #[test]
    fn test_min_all_nan() {
        assert!(min_f64(&[f64::NAN]).is_nan());
    }

    #[test]
    fn test_max_basic() {
        assert_near(max_f64(&[3.0, 1.0, 4.0]), 4.0);
    }

    #[test]
    fn test_var_sample() {
        // [2, 4, 4, 4, 5, 5, 7, 9] — ddof=1
        let data = vec![2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
        assert_near(var_f64(&data, 1.0), 4.571428571428571);
    }

    #[test]
    fn test_var_too_few() {
        assert!(var_f64(&[1.0], 1.0).is_nan());
    }

    #[test]
    fn test_std_basic() {
        let data = vec![2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0];
        assert_near(std_f64(&data, 1.0), var_f64(&data, 1.0).sqrt());
    }

    #[test]
    fn test_median_odd() {
        assert_near(median_f64(&[3.0, 1.0, 2.0]), 2.0);
    }

    #[test]
    fn test_median_even() {
        assert_near(median_f64(&[1.0, 2.0, 3.0, 4.0]), 2.5);
    }

    #[test]
    fn test_median_nan_skipped() {
        assert_near(median_f64(&[f64::NAN, 1.0, 3.0]), 2.0);
    }

    #[test]
    fn test_median_empty() {
        assert!(median_f64(&[]).is_nan());
    }
}
