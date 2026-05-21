"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Camera,
  Loader2,
  MessageSquareText,
  Move,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useActiveFloor, useCurrentDesign } from "@/lib/store";
import {
  applyChatOperations,
  describeOperation,
  runAIChat,
  type ChatMessage,
  type ChatOperation,
} from "@/lib/ai-chat";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Right-side chat drawer — "Cursor for floor plans".
 *
 * The user types, Claude responds with text + structured edit operations,
 * we auto-apply ops to the store and surface a chip list under each
 * assistant message so the user can see exactly what was changed.
 */
export function AIChatPanel({ open, onClose }: Props) {
  const design = useCurrentDesign();
  const floor = useActiveFloor();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  // Focus the input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function send(text: string) {
    if (!floor || !design || !text.trim() || busy) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const pending = [...messages, userMsg];
    setMessages(pending);
    setInput("");
    setBusy(true);

    try {
      const result = await runAIChat({
        designName: design.name,
        floor,
        messages: pending.map((m) => ({ role: m.role, content: m.content })),
      });

      // Apply ops immediately so the user sees the canvas update before they
      // even read Claude's reply.
      let applied = false;
      if (result.operations.length > 0) {
        const counts = applyChatOperations(floor.id, result.operations);
        applied = true;
        const summary = [
          counts.added && `+${counts.added}`,
          counts.moved && `↻${counts.moved}`,
          counts.rotated && `⟲${counts.rotated}`,
          counts.removed && `−${counts.removed}`,
          counts.updated && `✎${counts.updated}`,
          counts.walls && `▢${counts.walls}`,
        ]
          .filter(Boolean)
          .join(" · ");
        if (summary) {
          toast.success("Applied " + summary, {
            description: result.reply.split("\n")[0]?.slice(0, 80),
          });
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply,
          operations: result.operations,
          applied,
        },
      ]);
    } catch (err) {
      toast.error("Chat failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong reaching Claude. Try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setMessages([]);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close chat"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <MessageSquareText className="size-4" strokeWidth={1.7} />
            </div>
            <div>
              <div className="text-[0.95rem] font-semibold tracking-[-0.01em]">
                AI editor
              </div>
              <div className="text-[0.74rem] text-muted-foreground">
                Tell Claude what to change. Edits land on the canvas instantly.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clear}
                title="Clear conversation"
                className="rounded-md px-2 py-1 text-[0.72rem] text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Conversation */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {messages.length === 0 && !busy && (
            <EmptyState onPick={(prompt) => send(prompt)} />
          )}

          {messages.map((m, i) => (
            <ChatBubble key={i} msg={m} />
          ))}

          {busy && (
            <div className="flex items-center gap-2 px-1 py-2 text-[0.78rem] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>Claude is thinking…</span>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border/70 bg-background/30 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 shadow-[inset_0_1px_0_oklch(1_0_0/3%)] focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-colors"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={
                floor && floor.devices.length === 0
                  ? "Try: \"Add a dome camera at the front door\""
                  : "Ask Claude to add, move, or tweak devices…"
              }
              className="min-h-[20px] max-h-[120px] flex-1 resize-none bg-transparent text-[0.88rem] leading-relaxed outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy || !floor}
              className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ArrowUp className="size-3.5" strokeWidth={2.4} />
              )}
            </button>
          </form>
          <div className="mt-1.5 px-1 text-[0.66rem] text-muted-foreground/70">
            Enter to send · Shift+Enter for newline · Edits auto-apply
          </div>
        </div>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const suggestions = [
    {
      icon: <Camera className="size-3.5" strokeWidth={1.8} />,
      text: "Add a dome camera at every corner of the largest room.",
    },
    {
      icon: <Move className="size-3.5" strokeWidth={1.8} />,
      text: "Move the lobby camera so it faces the front door.",
    },
    {
      icon: <RotateCw className="size-3.5" strokeWidth={1.8} />,
      text: "Rotate the back-hallway camera 90° to cover the corridor.",
    },
    {
      icon: <Plus className="size-3.5" strokeWidth={1.8} />,
      text: "Cover every door with a motion sensor.",
    },
    {
      icon: <Wand2 className="size-3.5" strokeWidth={1.8} />,
      text: "Critique my current layout — what's missing?",
    },
  ];
  return (
    <div className="flex flex-col items-center gap-5 pt-6 px-2 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </div>
      <div className="space-y-1.5">
        <div className="text-[0.95rem] font-medium tracking-[-0.01em]">
          What should we change?
        </div>
        <div className="mx-auto max-w-[22rem] text-[0.78rem] text-muted-foreground leading-relaxed">
          Claude can add, move, rotate, or remove devices on the active floor.
          Speak in plain English — coordinates are figured out for you.
        </div>
      </div>
      <div className="grid w-full gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s.text)}
            className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-left text-[0.78rem] text-foreground/85 hover:border-primary/40 hover:bg-primary/[0.04] transition-colors"
          >
            <span className="mt-0.5 text-primary/80">{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ChatBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-[0.85rem] leading-relaxed text-primary-foreground shadow-[0_2px_8px_-3px_oklch(0.55_0.17_245/35%)]">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="flex w-full max-w-[92%] gap-2">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
          <Sparkles className="size-3" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-card/60 px-3 py-2 text-[0.85rem] leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {msg.content}
          </div>
          {msg.operations && msg.operations.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {msg.operations.map((op, i) => (
                <OperationChip key={i} op={op} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OperationChip({ op }: { op: ChatOperation }) {
  const text = describeOperation(op);
  const tone = (() => {
    if (op.kind === "add-device" || op.kind === "add-wall")
      return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/25";
    if (op.kind === "remove-device")
      return "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/25";
    if (op.kind === "move-device" || op.kind === "rotate-device")
      return "bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-sky-500/25";
    return "bg-foreground/[0.06] text-foreground/80 ring-foreground/15";
  })();
  const Icon = (() => {
    if (op.kind === "add-device" || op.kind === "add-wall") return Plus;
    if (op.kind === "remove-device") return Trash2;
    if (op.kind === "move-device") return Move;
    if (op.kind === "rotate-device") return RotateCw;
    return Sparkles;
  })();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium ring-1",
        tone,
      )}
    >
      <Icon className="size-3" strokeWidth={2} />
      {text}
    </span>
  );
}
