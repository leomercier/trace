"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, Camera, Loader2 } from "lucide-react";
import { useEditor } from "@/stores/editorStore";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AssistantDrawer({
  open,
  onClose,
  pageId,
}: {
  open: boolean;
  onClose: () => void;
  pageId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  // Initialise greeting based on current canvas state
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const s = useEditor.getState();
    const m = Object.keys(s.measurements).length;
    const p = Object.keys(s.placedItems).length;
    const n = Object.keys(s.notes).length;
    setMessages([
      {
        role: "assistant",
        content: `Hi. I can see your canvas — ${m} measurement${m === 1 ? "" : "s"}, ${p} item${p === 1 ? "" : "s"}, ${n} note${n === 1 ? "" : "s"}. Ask me anything about the drawing or layout.`,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  /**
   * Capture the current Pixi canvas as a base64 PNG (without data: prefix).
   */
  function captureSnapshot(): string | null {
    const cv = document.querySelector(".pixi-host canvas") as HTMLCanvasElement | null;
    if (!cv) return null;
    try {
      const url = cv.toDataURL("image/png");
      const idx = url.indexOf(",");
      if (idx < 0) return null;
      return url.slice(idx + 1);
    } catch {
      return null;
    }
  }

  function buildPageContext() {
    const s = useEditor.getState();
    const placedItemNames = Object.values(s.placedItems).map((p) => p.name);
    return {
      fileName: null as string | null,
      measurementCount: Object.keys(s.measurements).length,
      noteCount: Object.keys(s.notes).length,
      placedItemNames,
      scale: s.scale ? { realPerUnit: s.scale.realPerUnit, unit: s.scale.unit } : null,
    };
  }

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const snapshot = captureSnapshot();
      const res = await fetch("/api/ai/canvas-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pageId,
          messages: newMessages,
          canvasSnapshot: snapshot,
          pageContext: buildPageContext(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: json.error || "Something went wrong." },
        ]);
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: json.reply || "(no response)" },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Network error. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const suggestions = [
    "What's on the page?",
    "Sum all my measurements",
    "Will a 3-seat sofa fit here?",
    "Suggest furniture for this layout",
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-end md:items-stretch md:justify-end bg-black/30 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-panel shadow-lg md:h-full md:max-w-[440px] md:rounded-none md:rounded-l-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex size-8 items-center justify-center rounded-full text-white"
              style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
            >
              <Sparkles size={14} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-serif text-lg leading-none">Ask AI</div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-faint">
                <Camera size={10} /> Sees your canvas
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-panel-muted hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <Bubble key={i} m={m} />
          ))}
          {loading ? (
            <div className="flex items-center gap-2 text-ink-muted">
              <div
                className="flex size-6 items-center justify-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
              >
                <Sparkles size={11} strokeWidth={2.5} />
              </div>
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm">Thinking…</span>
            </div>
          ) : null}
        </div>

        {messages.length <= 1 && !loading ? (
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-panel-muted px-3 py-1.5 text-xs hover:bg-panel"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2 border-t border-border bg-panel p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about the drawing…"
            className="h-10 flex-1 rounded-md border border-border bg-panel px-3 text-sm focus:border-ink focus:outline-none"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="flex size-10 items-center justify-center rounded-md bg-ink text-white disabled:bg-panel-muted disabled:text-ink-faint"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: Message }) {
  return (
    <div
      className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
    >
      {m.role === "assistant" ? (
        <div
          className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
        >
          <Sparkles size={11} strokeWidth={2.5} />
        </div>
      ) : null}
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          m.role === "user" ? "bg-ink text-white" : "bg-panel-muted text-ink"
        }`}
      >
        {m.content}
      </div>
    </div>
  );
}
