/*!
 * Sliding-window (rolling) and expanding-window reduction accelerators.
 *
 * All functions accept a `Float64Array`, a window size, and a `min_periods`
 * threshold.  Positions where the count of non-NaN values in the current
 * window is less than `min_periods` produce `NaN` in the output, matching the
 * TypeScript `Rolling` / `Expanding` implementations.
 *
 * Expanding variants are implemented by passing `window = data.len()` and
 * resetting `start = 0` every iteration.
 */

use wasm_bindgen::prelude::*;

// ─── helpers ─────────────────────────────────────────────────────────────────

/// Compute `sum` and `count` of non-NaN values in `data[start..end]`.
#[inline]
fn window_sum_count(data: &[f64], start: usize, end: usize) -> (f64, usize) {
    let mut sum = 0.0_f64;
    let mut count = 0_usize;
    for i in start..end {
        if !data[i].is_nan() {
            sum += data[i];
            count += 1;
        }
    }
    (sum, count)
}

/// Return the median of `nums` (already collected as non-NaN values).
fn slice_median(nums: &mut Vec<f64>) -> f64 {
    nums.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let n = nums.len();
    if n % 2 == 1 {
        nums[n / 2]
    } else {
        (nums[n / 2 - 1] + nums[n / 2]) / 2.0
    }
}

// ─── rolling window functions ─────────────────────────────────────────────────

/// Rolling sum. Positions with fewer than `min_periods` non-NaN values → NaN.
#[wasm_bindgen]
pub fn rolling_sum_f64(data: &[f64], window: u32, min_periods: u32) -> Vec<f64> {
    let n = data.len();
    let w = window as usize;
    let mp = min_periods as usize;
    let mut result = vec![f64::NAN; n];
    for i in 0..n {
        let start = if i + 1 >= w { i + 1 - w } else { 0 };
        let (sum, count) = window_sum_count(data, start, i + 1);
        if count >= mp {
            result[i] = sum;
        }
    }
    result
}

/// Rolling arithmetic mean.
#[wasm_bindgen]
pub fn rolling_mean_f64(data: &[f64], window: u32, min_periods: u32) -> Vec<f64> {
    let n = data.len();
    let w = window as usize;
    let mp = min_periods as usize;
    let mut result = vec![f64::NAN; n];
    for i in 0..n {
        let start = if i + 1 >= w { i + 1 - w } else { 0 };
        let (sum, count) = window_sum_count(data, start, i + 1);
        if count >= mp {
            result[i] = sum / count as f64;
        }
    }
    result
}

/// Rolling minimum.
#[wasm_bindgen]
pub fn rolling_min_f64(data: &[f64], window: u32, min_periods: u32) -> Vec<f64> {
    let n = data.len();
    let w = window as usize;
    let mp = min_periods as usize;
    let mut result = vec![f64::NAN; n];
    for i in 0..n {
        let start = if i + 1 >= w { i + 1 - w } else { 0 };
        let mut min_val = f64::NAN;
        let mut count = 0_usize;
        for j in start..i + 1 {
            if !data[j].is_nan() {
                if min_val.is_nan() || data[j] < min_val {
                    min_val = data[j];
                }
                count += 1;
            }
        }
        if count >= mp {
            result[i] = min_val;
        }
    }
    result
}

/// Rolling maximum.
#[wasm_bindgen]
pub fn rolling_max_f64(data: &[f64], window: u32, min_periods: u32) -> Vec<f64> {
    let n = data.len();
    let w = window as usize;
    let mp = min_periods as usize;
    let mut result = vec![f64::NAN; n];
    for i in 0..n {
        let start = if i + 1 >= w { i + 1 - w } else { 0 };
        let mut max_val = f64::NAN;
        let mut count = 0_usize;
        for j in start..i + 1 {
            if !data[j].is_nan() {
                if max_val.is_nan() || data[j] > max_val {
                    max_val = data[j];
                }
                count += 1;
            }
        }
        if count >= mp {
            result[i] = max_val;
        }
    }
    result
}

/// Rolling variance (delta degrees-of-freedom `ddof`).
/// Positions with fewer than `ddof + 1` valid values → NaN.
#[wasm_bindgen]
pub fn rolling_var_f64(data: &[f64], window: u32, min_periods: u32, ddof: f64) -> Vec<f64> {
    let n = data.len();
    let w = window as usize;
    let mp = min_periods as usize;
    let mut result = vec![f64::NAN; n];
    for i in 0..n {
        let start = if i + 1 >= w { i + 1 - w } else { 0 };
        let mut vals: Vec<f64> = Vec::new();
        for j in start..i + 1 {
            if !data[j].is_nan() {
                vals.push(data[j]);
            }
        }
        let cnt = vals.len() as f64;
        if vals.len() >= mp && cnt > ddof {
            let mu = vals.iter().sum::<f64>() / cnt;
            let ss: f64 = vals.iter().map(|v| (v - mu) * (v - mu)).sum();
            result[i] = ss / (cnt - ddof);
        }
    }
    result
}

/// Rolling standard deviation (delta degrees-of-freedom `ddof`).
#[wasm_bindgen]
pub fn rolling_std_f64(data: &[f64], window: u32, min_periods: u32, ddof: f64) -> Vec<f64> {
    rolling_var_f64(data, window, min_periods, ddof)
        .into_iter()
        .map(|v| v.sqrt())
        .collect()
}

/// Rolling median.
#[wasm_bindgen]
pub fn rolling_median_f64(data: &[f64], window: u32, min_periods: u32) -> Vec<f64> {
    let n = data.len();
    let w = window as usize;
    let mp = min_periods as usize;
    let mut result = vec![f64::NAN; n];
    for i in 0..n {
        let start = if i + 1 >= w { i + 1 - w } else { 0 };
        let mut vals: Vec<f64> = (start..i + 1)
            .filter(|&j| !data[j].is_nan())
            .map(|j| data[j])
            .collect();
        if vals.len() >= mp {
            result[i] = slice_median(&mut vals);
        }
    }
    result
}

// ─── expanding window variants ────────────────────────────────────────────────
// These reuse the rolling functions with a window equal to the full array
// length, making the window grow from left for each position (expanding).

/// Expanding sum.
#[wasm_bindgen]
pub fn expanding_sum_f64(data: &[f64], min_periods: u32) -> Vec<f64> {
    let n = data.len() as u32;
    rolling_sum_f64(data, n, min_periods)
}

/// Expanding mean.
#[wasm_bindgen]
pub fn expanding_mean_f64(data: &[f64], min_periods: u32) -> Vec<f64> {
    let n = data.len() as u32;
    rolling_mean_f64(data, n, min_periods)
}

/// Expanding minimum.
#[wasm_bindgen]
pub fn expanding_min_f64(data: &[f64], min_periods: u32) -> Vec<f64> {
    let n = data.len() as u32;
    rolling_min_f64(data, n, min_periods)
}

/// Expanding maximum.
#[wasm_bindgen]
pub fn expanding_max_f64(data: &[f64], min_periods: u32) -> Vec<f64> {
    let n = data.len() as u32;
    rolling_max_f64(data, n, min_periods)
}

/// Expanding variance (delta degrees-of-freedom `ddof`).
#[wasm_bindgen]
pub fn expanding_var_f64(data: &[f64], min_periods: u32, ddof: f64) -> Vec<f64> {
    let n = data.len() as u32;
    rolling_var_f64(data, n, min_periods, ddof)
}

/// Expanding standard deviation (delta degrees-of-freedom `ddof`).
#[wasm_bindgen]
pub fn expanding_std_f64(data: &[f64], min_periods: u32, ddof: f64) -> Vec<f64> {
    expanding_var_f64(data, min_periods, ddof)
        .into_iter()
        .map(|v| v.sqrt())
        .collect()
}

/// Expanding median.
#[wasm_bindgen]
pub fn expanding_median_f64(data: &[f64], min_periods: u32) -> Vec<f64> {
    let n = data.len() as u32;
    rolling_median_f64(data, n, min_periods)
}

// ─── unit tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_near(a: f64, b: f64) {
        if a.is_nan() && b.is_nan() {
            return;
        }
        assert!(!a.is_nan(), "expected {}, got NaN", b);
        assert!(!b.is_nan(), "expected NaN, got {}", a);
        assert!(
            (a - b).abs() < 1e-9,
            "expected {}, got {}",
            b,
            a
        );
    }

    fn assert_vec_near(actual: &[f64], expected: &[f64]) {
        assert_eq!(actual.len(), expected.len());
        for (i, (&a, &e)) in actual.iter().zip(expected.iter()).enumerate() {
            if e.is_nan() {
                assert!(a.is_nan(), "pos {}: expected NaN, got {}", i, a);
            } else {
                assert_near(a, e);
            }
        }
    }

    #[test]
    fn test_rolling_sum_basic() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let result = rolling_sum_f64(&data, 3, 3);
        assert_vec_near(
            &result,
            &[f64::NAN, f64::NAN, 6.0, 9.0, 12.0],
        );
    }

    #[test]
    fn test_rolling_sum_min_periods_1() {
        let data = vec![1.0, 2.0, 3.0];
        let result = rolling_sum_f64(&data, 3, 1);
        assert_vec_near(&result, &[1.0, 3.0, 6.0]);
    }

    #[test]
    fn test_rolling_mean_basic() {
        let data = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let result = rolling_mean_f64(&data, 3, 3);
        assert_vec_near(
            &result,
            &[f64::NAN, f64::NAN, 2.0, 3.0, 4.0],
        );
    }

    #[test]
    fn test_rolling_mean_with_nan() {
        let data = vec![1.0, f64::NAN, 3.0, 4.0, 5.0];
        let result = rolling_mean_f64(&data, 3, 2);
        // window [1,NaN]: 1 valid < 2 → NaN
        // window [1,NaN,3]: 2 valid → (1+3)/2 = 2
        // window [NaN,3,4]: 2 valid → 3.5
        // window [3,4,5]: 3 valid → 4
        assert_vec_near(
            &result,
            &[f64::NAN, f64::NAN, 2.0, 3.5, 4.0],
        );
    }

    #[test]
    fn test_rolling_min_basic() {
        let data = vec![3.0, 1.0, 2.0, 5.0, 4.0];
        let result = rolling_min_f64(&data, 3, 3);
        assert_vec_near(
            &result,
            &[f64::NAN, f64::NAN, 1.0, 1.0, 2.0],
        );
    }

    #[test]
    fn test_rolling_max_basic() {
        let data = vec![1.0, 3.0, 2.0, 5.0, 4.0];
        let result = rolling_max_f64(&data, 3, 3);
        assert_vec_near(
            &result,
            &[f64::NAN, f64::NAN, 3.0, 5.0, 5.0],
        );
    }

    #[test]
    fn test_rolling_var_basic() {
        let data = vec![1.0, 2.0, 3.0, 4.0];
        let result = rolling_var_f64(&data, 3, 3, 1.0);
        // var([1,2,3]) = 1, var([2,3,4]) = 1
        assert_vec_near(&result, &[f64::NAN, f64::NAN, 1.0, 1.0]);
    }

    #[test]
    fn test_rolling_median_basic() {
        let data = vec![1.0, 3.0, 2.0, 4.0, 5.0];
        let result = rolling_median_f64(&data, 3, 3);
        assert_vec_near(
            &result,
            &[f64::NAN, f64::NAN, 2.0, 3.0, 4.0],
        );
    }

    #[test]
    fn test_expanding_sum() {
        let data = vec![1.0, 2.0, 3.0];
        let result = expanding_sum_f64(&data, 1);
        assert_vec_near(&result, &[1.0, 3.0, 6.0]);
    }

    #[test]
    fn test_expanding_mean() {
        let data = vec![1.0, 2.0, 3.0];
        let result = expanding_mean_f64(&data, 1);
        assert_vec_near(&result, &[1.0, 1.5, 2.0]);
    }

    #[test]
    fn test_expanding_with_nan() {
        let data = vec![1.0, f64::NAN, 3.0];
        let result = expanding_sum_f64(&data, 1);
        assert_vec_near(&result, &[1.0, 1.0, 4.0]);
    }
}
