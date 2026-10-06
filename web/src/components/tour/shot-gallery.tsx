"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GalleryShot {
  file: string;
  title: string;
  caption: string;
  mobile: boolean;
  full: string;
  thumb: string;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
}

/**
 * Screenshot grid with a lightbox. The thumbnails are pre-sized WebP files
 * (lazy-loaded); the full-size image is only fetched when a shot is opened.
 * Arrow keys move between shots while the lightbox is open.
 */
export function ShotGallery({ shots }: { shots: GalleryShot[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const shot = open === null ? null : shots[open];
  const go = (delta: number) =>
    setOpen((i) => (i === null ? i : (i + delta + shots.length) % shots.length));

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
        {shots.map((s, i) => (
          <li
            key={s.file}
            className={cn(s.mobile ? "col-span-1" : "col-span-2 sm:col-span-1", "min-w-0")}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full rounded-2xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Open screenshot: ${s.title}`}
            >
              <span
                className={cn(
                  "relative block overflow-hidden rounded-2xl border bg-muted shadow-(--shadow-soft) transition-shadow group-hover:shadow-(--shadow-lifted)",
                  s.mobile && "mx-auto max-w-[220px]",
                )}
              >
                <Image
                  src={s.thumb}
                  alt=""
                  width={s.thumbWidth}
                  height={s.thumbHeight}
                  unoptimized
                  loading="lazy"
                  className="block h-auto w-full"
                />
                <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-lg bg-background/85 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Expand className="size-3.5" aria-hidden="true" />
                </span>
              </span>
              <span className="mt-2.5 block text-sm font-medium">{s.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                {s.caption}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={shot !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {shot && (
          <DialogContent
            className={cn(
              "max-h-[calc(100dvh-2rem)] gap-3 overflow-y-auto p-3 sm:p-4",
              shot.mobile ? "sm:max-w-md" : "sm:max-w-[min(1200px,calc(100vw-4rem))]",
            )}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") go(1);
              if (e.key === "ArrowLeft") go(-1);
            }}
          >
            <DialogHeader className="pr-10">
              <DialogTitle>{shot.title}</DialogTitle>
              <DialogDescription>
                {shot.caption}{" "}
                <span className="tabular">
                  ({(open ?? 0) + 1} of {shots.length})
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-hidden rounded-xl border bg-muted">
              <Image
                key={shot.full}
                src={shot.full}
                alt={`${shot.title}: ${shot.caption}`}
                width={shot.width}
                height={shot.height}
                unoptimized
                className="mx-auto block h-auto w-full"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => go(-1)}>
                <ChevronLeft aria-hidden="true" /> Previous
              </Button>
              <a
                href={shot.full}
                className="text-xs font-medium text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Open full size
              </a>
              <Button variant="outline" size="sm" onClick={() => go(1)}>
                Next <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
