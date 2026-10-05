import { avatarHue, initialsOf } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** Map pin: a teardrop with the person's initials (or photo). */
export function MeetingPin({
  firstName,
  lastName,
  seed,
  portrait,
  active,
  upcoming,
}: {
  firstName: string;
  lastName: string;
  seed: string;
  portrait?: string | null;
  active?: boolean;
  upcoming?: boolean;
}) {
  const hue = avatarHue(seed);
  return (
    <span
      className={cn(
        "relative flex size-9 -translate-y-1/2 [transform:rotate(45deg)] items-center justify-center rounded-full rounded-br-none border-2 border-white shadow-(--shadow-lifted) transition-transform",
        active && "z-10 scale-125",
      )}
      style={{ background: upcoming ? "var(--primary)" : `oklch(0.62 0.13 ${hue})` }}
    >
      <span className="flex size-full -rotate-45 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white">
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element -- small data URL
          <img src={portrait} alt="" className="size-full object-cover" />
        ) : (
          initialsOf(firstName, lastName)
        )}
      </span>
    </span>
  );
}
