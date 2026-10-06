# DR-008: Run the server functions in Sydney (syd1), close to the visitors

- **Status:** Accepted (follows DR-007, whose "What I'd change" suggested the database's region instead)
- **Date:** 2026-10-06
- **Author:** Sunchuangyu (Rin) Huang

## Context

After DR-007 the live demo used the hosted Turso database in AWS `ap-northeast-1` (Tokyo), while the Vercel functions ran in `iad1` (US East), Vercel's default. The people this demo is for, employers reading a portfolio and me, are mostly in Australia. Every signed-in page therefore went from Australia to the US for the function, and from the US to Tokyo for every database query. DR-007 measured a median time to first byte of 0.75 s and suggested moving the functions to the database's region (`hnd1`).

## Decision

Pin the functions to Vercel's `syd1` (Sydney) region with `"regions": ["syd1"]` in `web/vercel.json`, and leave the database in Tokyo. Nothing else changes: same code, same database, same environment variables.

## Options considered

1. **Keep `iad1`.** Nothing to change, but both legs of every request cross an ocean.
2. **`syd1`, next to the visitors** (chosen). The visitor's leg becomes short, and Sydney is still closer to Tokyo than US East is.
3. **`hnd1`, next to the database**, as DR-007 suggested. Queries become local, but every request from Australia then travels to Japan and back. It wins when a page makes many queries one after another.
4. **Recreate the database closer to Australia.** It needs a new database, a copy of the data and new credentials, which is more work and more risk than a one-line setting, so it waits until the setting is shown not to be enough.

## Why

- It is a one-line, reversible configuration change that is easy to measure before and after.
- The visitors are in Australia, and a Sydney function is also closer to the database than the US default.
- `hnd1` may well be faster for pages with many sequential queries, but I chose to keep the function near the people using it and measure, rather than guess, how much the database leg still costs.

## What happened

Measured on 6 October 2026 from one machine in Australia, signed in as the shared demo user. Eight signed-in pages (`/home`, `/contacts`, `/records`, `/insights`, `/calendar`, `/activity`, `/ai-log` and `/your-data`) were requested four times each with `curl`, 32 requests per region: `iad1` just before the change and `syd1` just after the redeploy. Every response was a 200, and the `x-vercel-id` header showed `syd1::iad1` before and `syd1::syd1` after.

| Region | Median time to first byte (95% CI) | Interquartile range | Range |
| --- | --- | --- | --- |
| `iad1` (before) | 0.74 s (0.72-0.76 s), n = 32 | 0.71-0.77 s | 0.68-2.57 s |
| `syd1` (after) | 0.45 s (0.43-0.47 s), n = 32 | 0.42-0.52 s | 0.39-2.27 s |

Paired by page and round, `syd1` was faster in 30 of 32 pairs (two-sided sign test p < 0.001), and the median saving was 0.29 s (95% CI 0.27-0.32 s), about 40%. The intervals are percentile bootstrap intervals (2,000 resamples, seed 4399) from the site's own helper in `web/src/lib/stats`.

The weak points are real. The two runs were a few minutes apart rather than interleaved, from a single machine and network, so time-of-day effects are not controlled. Requests within a run share a server instance and a network path, so they are not independent and the intervals are too narrow. Each run includes one cold start (the 2.3-2.6 s maxima). `hnd1` was not measured, so this record shows that `syd1` beats the default, not that it is the best region. The remaining 0.45 s is still mostly the trip to Tokyo and back.

## What I'd change

- Compare regions with interleaved requests to two deployments of the same commit, over several sessions and times of day, and include `hnd1`.
- Batch the database queries each page makes, so the distance to the database matters less whichever region the functions use.
- If the latency still matters after that, recreate the database closer to Australia and measure again.
