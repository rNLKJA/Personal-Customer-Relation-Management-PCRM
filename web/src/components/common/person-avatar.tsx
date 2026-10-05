import { avatarHue, initialsOf } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

/**
 * Generated initials avatar (deterministic hue per person). Replaces the
 * uploaded photos of the original app; an optional small data-URL portrait is
 * shown instead when present.
 */
export function PersonAvatar({
  firstName,
  lastName,
  seed,
  portrait,
  size = "md",
  className,
}: {
  firstName?: string | null;
  lastName?: string | null;
  seed?: string;
  portrait?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const initials = initialsOf(firstName, lastName);
  const hue = avatarHue(seed ?? `${firstName ?? ""} ${lastName ?? ""}`);
  const base = cn(
    "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight",
    SIZES[size],
    className,
  );
  if (portrait) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element -- small data URL */}
        <img src={portrait} alt="" className="size-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={base}
      aria-hidden="true"
      style={{
        background: `linear-gradient(140deg, oklch(0.93 0.05 ${hue}), oklch(0.84 0.09 ${hue}))`,
        color: `oklch(0.36 0.12 ${hue})`,
        boxShadow: `inset 0 0 0 1px oklch(0.5 0.1 ${hue} / 0.12)`,
      }}
    >
      {initials}
    </span>
  );
}
