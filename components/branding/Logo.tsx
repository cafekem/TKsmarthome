import { cn } from "@/lib/utils";

/**
 * DeeperVision logo mark: a layered depth symbol — three nested
 * chevrons/layers stacked in perspective, suggesting depth perception,
 * spatial understanding, and "seeing deeper" into 3D space.
 *
 * Clean geometric construction that scales from 14px (footer) to 96px (hero).
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
      {/* Three stacked depth layers — convey "deeper" and spatial/3D vision.
          Each chevron is progressively smaller, creating a tunnel perspective effect. */}
      <path
        d="M4 6 L12 12 L20 6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <path
        d="M6 10 L12 14.5 L18 10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
      <path
        d="M8 14 L12 17 L16 14"
        stroke="currentColor"
        strokeWidth={strokeWidth * 1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Focus dot at the convergence point — the "deeper" target */}
      <circle cx="12" cy="20" r="1.2" fill="currentColor" opacity="0.8" />
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
          DeeperVision
        </span>
      )}
    </span>
  );
}
