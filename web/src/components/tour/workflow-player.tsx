"use client";

import { useEffect, useRef, useState } from "react";
import { Captions, Download, Play } from "lucide-react";
import { formatBytes, formatClock } from "@/lib/tour";
import { cn } from "@/lib/utils";

/**
 * One recorded walkthrough: the video (nothing but the poster is fetched
 * until it is near the viewport, then only its metadata) and its steps as a
 * transcript. Each step's time seeks the video, and the step being shown is
 * highlighted while it plays.
 */
export function WorkflowPlayer({
  title,
  steps,
  times,
  duration,
  width,
  height,
  mp4,
  poster,
  captions,
  mp4Bytes,
}: {
  title: string;
  steps: string[];
  /** Start of each step in the video, in seconds. */
  times: number[];
  duration: number;
  width: number;
  height: number;
  mp4: string;
  poster: string;
  captions: string;
  mp4Bytes: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [current, setCurrent] = useState(-1);

  useEffect(() => {
    const el = video.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const onTime = () => {
    const t = video.current?.currentTime ?? 0;
    let i = -1;
    for (let k = 0; k < times.length; k++) if (t >= times[k] - 0.05) i = k;
    setCurrent(i);
  };

  const seek = (i: number) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = times[i] + 0.05;
    setCurrent(i);
    void el.play().catch(() => {});
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-2xl border bg-muted shadow-(--shadow-soft)">
          <video
            ref={video}
            className="block aspect-[16/10] h-auto w-full bg-muted"
            width={width}
            height={height}
            poster={poster}
            controls
            muted
            playsInline
            preload={near ? "metadata" : "none"}
            onTimeUpdate={onTime}
            aria-label={`Screen recording: ${title}`}
          >
            <source src={mp4} type="video/mp4" />
            <track kind="captions" src={captions} srcLang="en" label="English (step captions)" />
            Your browser cannot play this video. <a href={mp4}>Download the MP4</a> instead.
          </video>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular">
            {formatClock(duration)} · no sound · captions are on screen
          </span>
          <a
            href={mp4}
            download
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Download className="size-3.5" aria-hidden="true" /> MP4, {formatBytes(mp4Bytes)}
          </a>
          <a
            href={captions}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Captions className="size-3.5" aria-hidden="true" /> Captions (WebVTT)
          </a>
        </p>
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold">Steps and transcript</h3>
        <ol className="mt-3 space-y-1">
          {steps.map((step, i) => (
            <li key={step}>
              <button
                type="button"
                onClick={() => seek(i)}
                aria-current={current === i ? "step" : undefined}
                className={cn(
                  "group flex w-full gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  current === i && "bg-accent text-accent-foreground hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "tabular mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground",
                    current === i && "bg-primary text-primary-foreground",
                  )}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 leading-relaxed">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step}
                </span>
                <span className="tabular mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                  <Play className="size-3" aria-hidden="true" />
                  <span className="sr-only">play from</span> {formatClock(times[i] ?? 0)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
