"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { DevicePhoto } from "@/types/design";
import { cn } from "@/lib/utils";

interface Props {
  photos: DevicePhoto[];
  onAdd: (photo: DevicePhoto) => void;
  onRemove: (photoId: string) => void;
  onUpdateCaption?: (photoId: string, caption: string) => void;
}

/**
 * Thumbnail strip + uploader for device photos. The Add button kicks off the
 * native file picker; on iOS/iPad it also offers "Take Photo" via the
 * `capture="environment"` attribute, which gives this feature its System
 * Surveyor-style site-walk feel without a separate mobile app.
 */
export function DevicePhotoStrip({
  photos,
  onAdd,
  onRemove,
  onUpdateCaption,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<DevicePhoto | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      // Compress + downscale large camera photos so the design file stays
      // small (we keep them as base64 in localStorage right now).
      try {
        const dataUrl = await fileToCompressedDataUrl(file, 1600, 0.82);
        onAdd({
          id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          dataUrl,
          takenAt: new Date().toISOString(),
        });
      } catch (err) {
        toast.error("Couldn't read that photo", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Photos {photos.length > 0 && `· ${photos.length}`}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.72rem] font-medium text-primary hover:bg-primary/10"
        >
          <ImagePlus className="size-3.5" />
          Add
        </button>
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-foreground/[0.02] py-4 text-[0.74rem] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:border-primary/40 hover:text-foreground"
        >
          <Camera className="size-3.5" />
          Snap or upload a site-walk photo
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setLightboxPhoto(p)}
              className="group relative aspect-square overflow-hidden rounded-md ring-1 ring-border/60 transition-shadow hover:ring-primary/40 hover:shadow-md"
              title={p.caption || `Taken ${formatRelativeTime(p.takenAt)}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.dataUrl}
                alt={p.caption ?? "Device photo"}
                className="absolute inset-0 size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        // capture="environment" tells iOS to open the rear camera if available
        // (graceful no-op on desktop where it just opens the file picker).
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onRemove={() => {
            onRemove(lightboxPhoto.id);
            setLightboxPhoto(null);
          }}
          onUpdateCaption={
            onUpdateCaption
              ? (caption) => onUpdateCaption(lightboxPhoto.id, caption)
              : undefined
          }
        />
      )}
    </div>
  );
}

function PhotoLightbox({
  photo,
  onClose,
  onRemove,
  onUpdateCaption,
}: {
  photo: DevicePhoto;
  onClose: () => void;
  onRemove: () => void;
  onUpdateCaption?: (caption: string) => void;
}) {
  const [caption, setCaption] = useState(photo.caption ?? "");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />
      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-card shadow-2xl">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.dataUrl}
            alt={photo.caption ?? "Device photo"}
            className="max-h-[70vh] w-full rounded-t-2xl object-contain bg-black/5"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-background/85 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 border-t border-border/60 px-4 py-3">
          {onUpdateCaption ? (
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={() => caption !== (photo.caption ?? "") && onUpdateCaption(caption)}
              placeholder="Add a caption…"
              className="min-w-0 flex-1 rounded-md border border-border bg-background/40 px-3 py-1.5 text-[0.85rem] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            />
          ) : (
            <div className="flex-1 text-[0.78rem] text-muted-foreground">
              Taken {formatRelativeTime(photo.takenAt)}
            </div>
          )}
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.78rem]",
              "text-destructive hover:bg-destructive/10",
            )}
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Load a File into a downscaled, JPEG-compressed data URL.
 * iPhone HEIC/large photos can be 10+ MB raw — we cap the longest edge at
 * `maxEdge` and re-encode as JPEG so the design file stays manageable.
 */
async function fileToCompressedDataUrl(
  file: File,
  maxEdge: number,
  quality: number,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}
