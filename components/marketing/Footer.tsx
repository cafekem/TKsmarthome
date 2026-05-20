import { Eye } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          <span className="font-semibold text-foreground">Deeper Vision</span>
          <span>·</span>
          <span>Built for security integrators who want to ship faster.</span>
        </div>
        <div className="font-mono text-xs">v0.1.0 — preview</div>
      </div>
    </footer>
  );
}
