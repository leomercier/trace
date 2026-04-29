"use client";

import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";

const COMPONENTS = [
  "Button",
  "Input Field",
  "Card",
  "Dropdown",
  "Modal",
  "Tooltip",
];

export function ComponentPanel() {
  const [active, setActive] = useState("Button");

  return (
    <div className="rounded-md border border-white/15 bg-white/5 p-4 backdrop-blur-[1px]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-white/60">
          Components
        </span>
        <span className="font-mono text-[11px] text-white/40">v1.0</span>
      </div>

      <label className="mt-3 flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5">
        <Search className="size-3.5 text-white/50" />
        <input
          className="w-full bg-transparent text-xs text-white/80 outline-none placeholder:text-white/40"
          placeholder="Search"
          defaultValue=""
          aria-label="Search components"
        />
      </label>

      <ul className="mt-3 grid gap-1">
        {COMPONENTS.map((c) => (
          <li key={c}>
            <button
              type="button"
              onMouseEnter={() => setActive(c)}
              onFocus={() => setActive(c)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                active === c
                  ? "bg-white text-trace-violet"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <span className="font-medium">{c}</span>
              <ChevronRight className="size-3.5 opacity-60" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-md border border-white/15 bg-white/5 p-4">
        <div className="font-mono text-[10px] uppercase tracking-wider text-white/50">
          Preview · {active}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-md bg-white px-4 text-sm font-medium text-trace-violet">
            Primary
          </span>
          <span className="inline-flex h-9 items-center rounded-md border border-white/40 px-4 text-sm font-medium text-white">
            Secondary
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-white/70">
          <div className="flex items-center justify-between rounded border border-white/10 px-2 py-1">
            <span className="opacity-60">color-bg</span>
            <span>#FFFFFF</span>
          </div>
          <div className="flex items-center justify-between rounded border border-white/10 px-2 py-1">
            <span className="opacity-60">color-fg</span>
            <span>#6D5DF6</span>
          </div>
          <div className="flex items-center justify-between rounded border border-white/10 px-2 py-1">
            <span className="opacity-60">radius</span>
            <span>8px</span>
          </div>
          <div className="flex items-center justify-between rounded border border-white/10 px-2 py-1">
            <span className="opacity-60">space-x</span>
            <span>16px</span>
          </div>
        </div>
      </div>
    </div>
  );
}
