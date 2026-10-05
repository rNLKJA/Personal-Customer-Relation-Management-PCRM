"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "./person-avatar";
import { fileToPortraitDataUrl } from "@/lib/image";

/** Optional photo: resized in the browser to a small data URL, else generated initials. */
export function PortraitPicker({
  firstName,
  lastName,
  seed,
  value,
  onChange,
}: {
  firstName: string;
  lastName: string;
  seed: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-4">
      <PersonAvatar firstName={firstName || "?"} lastName={lastName} seed={seed} portrait={value} size="xl" />
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
            <Camera /> {value ? "Change photo" : "Add photo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2 /> Remove
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">Optional. Without a photo we show generated initials.</p>
        {error && (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        )}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            try {
              onChange(await fileToPortraitDataUrl(file));
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not read that image.");
            }
          }}
        />
      </div>
    </div>
  );
}
