"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ImageUp, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseQrPayload } from "@/lib/qr";

interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>;
}

let detectorPromise: Promise<Detector> | null = null;

/**
 * Native BarcodeDetector where the browser has one (Chrome/Edge/Android,
 * Safari 17+), otherwise the maintained `barcode-detector` ponyfill (ZXing
 * compiled to WebAssembly, served from /wasm on our own origin).
 */
function getDetector(): Promise<Detector> {
  detectorPromise ??= (async () => {
    const Native = (globalThis as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> } }).BarcodeDetector;
    if (Native) {
      try {
        if ((await Native.getSupportedFormats()).includes("qr_code")) return new Native({ formats: ["qr_code"] });
      } catch {
        // fall back to the ponyfill
      }
    }
    const mod = await import("barcode-detector/ponyfill");
    mod.setZXingModuleOverrides({
      locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : prefix + path),
    });
    return new mod.BarcodeDetector({ formats: ["qr_code"] }) as Detector;
  })();
  return detectorPromise;
}

/**
 * Replaces `react-qr-reader` from the original `qr-code.js`: scan a 4399 CRM
 * QR code with the camera or from an uploaded image, then hand the user name
 * to `onUserName` (which adds the contact by user name, as before).
 */
export function QrScanner({ onUserName, busy }: { onUserName: (userName: string) => void; busy?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);
  const handled = useRef<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  const handleRaw = useCallback(
    (raw: string) => {
      const userName = parseQrPayload(raw);
      if (!userName) {
        setMessage("That QR code isn't a 4399 CRM contact code.");
        return false;
      }
      if (handled.current === userName) return true;
      handled.current = userName;
      setMessage(`Found @${userName}`);
      stop();
      onUserName(userName);
      return true;
    },
    [onUserName, stop],
  );

  async function start() {
    setMessage(null);
    handled.current = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access isn't available here - upload a photo of the code instead.");
      return;
    }
    setStarting(true);
    try {
      const detector = await getDetector();
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stream.current = media;
      const el = video.current!;
      el.srcObject = media;
      await el.play();
      setScanning(true);
      const tick = async () => {
        if (!stream.current) return;
        try {
          if (el.readyState >= 2) {
            const codes = await detector.detect(el);
            if (codes[0] && handleRaw(codes[0].rawValue)) return;
          }
        } catch {
          // keep trying - some frames fail to decode
        }
        timer.current = window.setTimeout(tick, 250);
      };
      tick();
    } catch (err) {
      stop();
      setMessage(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission was denied. You can upload a photo of the code instead."
          : "Couldn't start the camera. Upload a photo of the code instead.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function fromFile(file: File) {
    setMessage(null);
    handled.current = null;
    try {
      const detector = await getDetector();
      const bitmap = await createImageBitmap(file);
      const codes = await detector.detect(bitmap);
      bitmap.close();
      if (!codes[0]) setMessage("No QR code found in that image.");
      else handleRaw(codes[0].rawValue);
    } catch {
      setMessage("Couldn't read that image.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border">
        <video ref={video} className={scanning ? "size-full object-cover" : "hidden"} playsInline muted aria-label="Camera preview" />
        {!scanning && (
          <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <ScanLine className="size-10 opacity-60" aria-hidden="true" />
            <p className="text-sm">Point your camera at someone&apos;s 4399 CRM code.</p>
          </div>
        )}
        {scanning && (
          <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {scanning ? (
          <Button variant="outline" onClick={stop}>
            <CameraOff /> Stop camera
          </Button>
        ) : (
          <Button onClick={start} disabled={starting || busy}>
            {starting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Camera aria-hidden="true" />} Start camera
          </Button>
        )}
        <Button variant="outline" asChild disabled={busy}>
          <label className="cursor-pointer">
            <ImageUp aria-hidden="true" /> Upload image
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) fromFile(f);
              }}
            />
          </label>
        </Button>
      </div>
      <p className="text-muted-foreground min-h-5 text-center text-sm" role="status" aria-live="polite">
        {busy ? "Adding contact…" : message}
      </p>
    </div>
  );
}
