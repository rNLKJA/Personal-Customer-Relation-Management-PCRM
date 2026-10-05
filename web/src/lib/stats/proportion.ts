import { zForConfidence } from "./normal";

/**
 * Proportions: Wilson score interval and the exact two-sided binomial (sign)
 * test. Both are checked against scipy / R in `stats.test.ts`.
 */

export interface Interval {
  estimate: number;
  lower: number;
  upper: number;
  confidence: number;
}

/**
 * Wilson score interval for `successes / n` (no continuity correction) - what
 * R's `prop.test(x, n, correct = FALSE)` and scipy's
 * `binomtest(x, n).proportion_ci(method = "wilson")` return. Unlike the Wald
 * interval it stays inside [0, 1] and behaves at 0/n and n/n.
 * Returns null when n is 0 (no data, no interval).
 */
export function wilsonInterval(successes: number, n: number, confidence = 0.95): Interval | null {
  if (!Number.isInteger(n) || n <= 0) return null;
  if (!Number.isInteger(successes) || successes < 0 || successes > n) {
    throw new RangeError(`successes must be an integer in [0, ${n}]`);
  }
  const z = zForConfidence(confidence);
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    estimate: p,
    // Clamp tiny floating-point excursions at the boundaries (0/n and n/n).
    lower: successes === 0 ? 0 : Math.max(0, centre - half),
    upper: successes === n ? 1 : Math.min(1, centre + half),
    confidence,
  };
}

/** log of n choose k, via a running sum (exact enough for n in the thousands). */
function logChoose(n: number, k: number): number {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

/**
 * Exact two-sided binomial test of H0: p = 0.5, i.e. the sign test for paired
 * comparisons (wins vs losses, ties dropped). For p = 0.5 the distribution is
 * symmetric, so the two-sided p-value is 2 * P(X <= min(k, n - k)), capped at 1
 * (scipy's `binomtest(k, n).pvalue`, R's `binom.test(k, n)$p.value`).
 */
export function signTestPValue(wins: number, n: number): number {
  if (n === 0) return 1;
  const k = Math.min(wins, n - wins);
  let tail = 0;
  for (let i = 0; i <= k; i++) tail += Math.exp(logChoose(n, i) - n * Math.LN2);
  return Math.min(1, 2 * tail);
}
