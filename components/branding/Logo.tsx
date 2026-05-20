import { cn } from "@/lib/utils";

/**
 * Deeper Vision wordmark icon: a rounded camera viewport with an internal
 * iris (suggesting a real lens), three faint aperture blades for mechanical
 * detail, and a centered pupil with a small highlight for a sense of depth.
 *
 * Reads as both "a camera lens" and "an eye looking deeper" at any size —
 * we use it from 14px (footer) up to 96px (hero badge).
 */
export function LogoMark({
  className,
  strokeWidth = 1.6,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-full", className)}
      aria-hidden="true"
    >
      {/* Outer rounded viewport — the housing of a security camera */}
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.2"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />

      {/* Inner ring — the lens iris */}
      <circle
        cx="12"
        cy="12"
        r="5.4"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.78}
      />

      {/* Aperture blades — three faint lines crossing the iris so it reads
         as a real mechanical aperture, not just a generic eye */}
      <g
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.42}
        strokeLinecap="round"
        opacity="0.5"
      >
        <line x1="12" y1="6.6" x2="12" y2="17.4" />
        <line x1="7.3" y1="9.3" x2="16.7" y2="14.7" />
        <line x1="7.3" y1="14.7" x2="16.7" y2="9.3" />
      </g>

      {/* Pupil dot */}
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />

      {/* Catchlight — tiny reflection on the pupil, gives the mark life
         and reinforces the "looking into a real 3D space" idea */}
      <circle cx="11.2" cy="11.2" r="0.55" fill="#ffffff" opacity="0.95" />
    </svg>
  );
}

/**
 * Logo mark + wordmark side-by-side. Pass a `markClassName` to size the
 * icon box; the text inherits from your normal class chain.
 */
export function Logo({
  className,
  markClassName = "size-6",
  showText = true,
  textClassName,
}: {
  className?: string;
  markClassName?: string;
  showText?: boolean;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          markClassName
        )}
      >
        <LogoMark />
      </span>
      {showText && (
        <span
          className={cn(
            "font-medium tracking-[-0.01em]",
            textClassName
          )}
        >
          Deeper Vision
        </span>
      )}
    </span>
  );
}
