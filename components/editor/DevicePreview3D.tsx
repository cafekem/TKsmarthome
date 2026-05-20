"use client";

import dynamic from "next/dynamic";
import type { PreviewKind } from "./DevicePreview3DCanvas";

const DevicePreview3DCanvas = dynamic(
  () =>
    import("./DevicePreview3DCanvas").then((m) => m.DevicePreview3DCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse rounded-md bg-muted/40" />
    ),
  }
);

export function DevicePreview3D({ kind }: { kind: PreviewKind }) {
  return <DevicePreview3DCanvas kind={kind} />;
}

export type { PreviewKind };
