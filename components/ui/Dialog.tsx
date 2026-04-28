"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        className={cn(
          "relative w-full max-w-md rounded-lg bg-panel shadow-lg border border-border",
          className,
        )}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-serif text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="rounded p-1 hover:bg-panel-muted"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        ) : null}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
