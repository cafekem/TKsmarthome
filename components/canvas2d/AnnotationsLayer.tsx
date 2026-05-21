"use client";

import { Group, Rect, Text } from "react-konva";
import type { Annotation } from "@/types/design";

/**
 * Renders pinned annotations on top of the Konva stage. Each annotation is
 * a small pill with the first line of text + a coloured tag for its kind
 * (note / warning / idea). AI-authored annotations show a tiny sparkle.
 *
 * Annotations don't participate in selection or device-targeting — they're
 * read-only on the canvas. The right-side properties panel is where the
 * user (or chat) edits/removes them.
 */
export function AnnotationsLayer({
  annotations,
  selectedId,
  onSelect,
}: {
  annotations: Annotation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Group>
      {annotations.map((a) => (
        <AnnotationPin
          key={a.id}
          annotation={a}
          selected={a.id === selectedId}
          onSelect={() => onSelect(a.id)}
        />
      ))}
    </Group>
  );
}

function AnnotationPin({
  annotation,
  selected,
  onSelect,
}: {
  annotation: Annotation;
  selected: boolean;
  onSelect: () => void;
}) {
  const { kind, text, position, author } = annotation;
  // First 28 chars or first line, whichever is shorter — keeps the marker compact.
  const oneLine = text.split("\n")[0];
  const shown = oneLine.length > 28 ? oneLine.slice(0, 26) + "…" : oneLine;
  // Approximate pixel width: 6.4px per char + padding + tag dot
  const labelWidth = Math.max(60, shown.length * 6.4 + 38);

  const tone = TONES[kind];

  return (
    <Group
      x={position.x}
      y={position.y}
      onClick={onSelect}
      onTap={onSelect}
      // Hand cursor on hover (set on the stage container by the canvas).
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "pointer";
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "default";
      }}
    >
      {/* Thread line from anchor dot to the pill */}
      <Rect x={0} y={-8} width={1} height={8} fill={tone.dot} opacity={0.6} />
      {/* Anchor dot */}
      <Rect
        x={-3}
        y={-3}
        width={6}
        height={6}
        cornerRadius={3}
        fill={tone.dot}
        stroke="#fff"
        strokeWidth={1.5}
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={3}
        shadowOffsetY={1}
      />

      {/* Pill body — offset above the anchor */}
      <Group x={6} y={-30}>
        <Rect
          width={labelWidth}
          height={22}
          cornerRadius={6}
          fill={tone.bg}
          stroke={selected ? "#0f172a" : tone.border}
          strokeWidth={selected ? 1.4 : 1}
          shadowColor="rgba(0,0,0,0.22)"
          shadowBlur={6}
          shadowOffsetY={2}
        />
        {/* Kind tag dot */}
        <Rect x={7} y={7} width={8} height={8} cornerRadius={4} fill={tone.dot} />
        {/* Sparkle indicator for AI-authored notes */}
        {author === "ai" && (
          <Text
            x={labelWidth - 14}
            y={4}
            text="✦"
            fontSize={10}
            fill={tone.dot}
            fontStyle="bold"
          />
        )}
        <Text
          x={20}
          y={5}
          text={shown}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize={11}
          fontStyle="500"
          fill={tone.text}
        />
      </Group>
    </Group>
  );
}

const TONES: Record<
  Annotation["kind"],
  { dot: string; bg: string; border: string; text: string }
> = {
  note: {
    dot: "#0ea5e9", // sky-500
    bg: "rgba(255, 255, 255, 0.96)",
    border: "rgba(14, 165, 233, 0.4)",
    text: "#0f172a",
  },
  warning: {
    dot: "#f59e0b", // amber-500
    bg: "rgba(255, 251, 235, 0.98)",
    border: "rgba(245, 158, 11, 0.55)",
    text: "#7c2d12",
  },
  idea: {
    dot: "#a855f7", // violet-500
    bg: "rgba(250, 245, 255, 0.98)",
    border: "rgba(168, 85, 247, 0.5)",
    text: "#581c87",
  },
};
