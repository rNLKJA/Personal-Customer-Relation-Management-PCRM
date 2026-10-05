# /// script
# requires-python = ">=3.11"
# dependencies = ["scipy>=1.11", "numpy"]
# ///
"""Reference values for the statistics helpers in web/src/lib/stats.

The TypeScript helpers (normal quantile, Wilson score interval, exact binomial
sign test, type-7 quantiles, percentile bootstrap) are unit-tested against the
numbers this script prints. They were also cross-checked in R:

    prop.test(3, 10, correct = FALSE)$conf.int   # Wilson score interval
    qnorm(c(0.975, 0.001, 1e-10))
    quantile(x, c(0.025, 0.9, 0.975), type = 7)
    binom.test(3, 15)$p.value

Run from the repository root:

    uv run scripts/stats_reference.py

Bootstrap intervals are Monte Carlo estimates, so the tests compare them with a
tolerance rather than exactly (scipy's and our random streams differ).
"""

import json

import numpy as np
from scipy import stats

out = {}
out["norm_ppf"] = {
    str(p): float(stats.norm.ppf(p))
    for p in [0.5, 0.9, 0.975, 0.995, 0.001, 1e-10, 0.02425, 0.97575]
}
w = {}
for x, n, conf in [
    (0, 10, 0.95),
    (3, 10, 0.95),
    (10, 10, 0.95),
    (36, 40, 0.95),
    (1, 1000, 0.95),
    (7, 20, 0.90),
    (50, 100, 0.99),
]:
    ci = stats.binomtest(x, n).proportion_ci(confidence_level=conf, method="wilson")
    w[f"{x}/{n}@{conf}"] = [float(ci.low), float(ci.high)]
out["wilson"] = w
out["binom_two_sided"] = {
    f"{k}/{n}": float(stats.binomtest(k, n, 0.5).pvalue)
    for k, n in [(8, 12), (3, 15), (0, 5), (6, 12), (10, 10), (11, 16)]
}
data = [2, 0, 1, 3, 1, 0, 2, 4, 1, 1, 0, 2]
out["quantile7"] = {str(p): float(np.quantile(data, p)) for p in [0, 0.025, 0.25, 0.5, 0.9, 0.975, 1]}
res = stats.bootstrap(
    (np.array(data, dtype=float),),
    np.mean,
    n_resamples=200000,
    method="percentile",
    confidence_level=0.95,
    random_state=np.random.default_rng(4399),
)
out["bootstrap_mean_percentile"] = [float(res.confidence_interval.low), float(res.confidence_interval.high)]
a = np.array([0.5, 0.75, 1.0, 0.5, 0.25, 1.0, 0.75, 0.5, 1.0, 0.5])
b = np.array([0.25, 0.5, 1.0, 0.25, 0.25, 0.5, 0.5, 0.5, 0.75, 0.0])
res2 = stats.bootstrap(
    (a - b,), np.mean, n_resamples=200000, method="percentile", random_state=np.random.default_rng(1)
)
out["paired_bootstrap"] = {
    "mean": float((a - b).mean()),
    "ci": [float(res2.confidence_interval.low), float(res2.confidence_interval.high)],
}
print(json.dumps(out, indent=1))
