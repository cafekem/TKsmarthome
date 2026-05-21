"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import dynamic from "next/dynamic";

/**
 * Tiny 3D thumbnail of the Pegman character — used in the 3D mode panel
 * as the drag handle. Exposes a `snapshot()` method that captures the
 * live canvas into a PNG data URL, which then becomes the drag-preview
 * image so the cursor carries the real 3D character.
 *
 * R3F is lazy by default — it renders once on mount and only when
 * something changes. For a static character that's exactly one frame,
 * which stays in the WebGL framebuffer ready for toDataURL().
 */

const Inner = dynamic(
  () => import("./PegmanThumbnailInner").then((m) => m.PegmanThumbnailInner),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse rounded-md bg-muted/40" />
    ),
  },
);

export interface PegmanThumbnailHandle {
  /** PNG data URL of the rendered character, or null if not ready. */
  snapshot(): string | null;
}

export const PegmanThumbnail = forwardRef<PegmanThumbnailHandle>(
  function PegmanThumbnail(_props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      snapshot() {
        const canvas = containerRef.current?.querySelector("canvas");
        if (!(canvas instanceof HTMLCanvasElement)) return null;
        try {
          return canvas.toDataURL("image/png");
        } catch {
          return null;
        }
      },
    }));

    return (
      <div ref={containerRef} className="size-full">
        <Inner />
      </div>
    );
  },
);
