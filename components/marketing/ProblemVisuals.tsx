"use client";

import { useEffect, useRef, useState } from "react";

export function MarkupVisual() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-canvas p-6 shadow-sm">
      <div className="grid gap-3">
        <Email subject="Re: Re: Re: Plans v3 (final FINAL)" from="Marco" body="See attached, my notes are in pencil on page 4..." />
        <Email subject="Fwd: marked up" from="Aida" body="Did you get Marco&apos;s? I&apos;m on a different version." />
        <Email subject="Re: scale check" from="Léo" body="Which one are we using? PDF or DWG?" />
      </div>
      <div className="absolute right-4 top-4 rotate-6 rounded-md border border-note-border bg-note px-3 py-1.5 font-hand text-sm text-ink shadow-sm">
        ↳ This dies here.
      </div>
    </div>
  );
}

function Email({ subject, from, body }: { subject: string; from: string; body: string }) {
  return (
    <div className="rounded border border-border bg-panel-muted p-3">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span className="font-medium text-ink">{from}</span>
        <span className="font-mono">11:42</span>
      </div>
      <div className="mt-1 text-sm font-medium text-ink">{subject}</div>
      <div className="mt-1 line-clamp-1 text-xs text-ink-muted">{body}</div>
    </div>
  );
}

export function CalibrateVisual() {
  const [t, setT] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!hover) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = ((now - start) / 1800) % 1;
      setT(k);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hover]);

  const ax = 100;
  const ay = 250;
  const bx = 100 + 400 + Math.sin(t * Math.PI * 2) * 120;
  const by = 250;
  const realPerPx = 12.4 / 400;
  const measured = Math.abs(bx - ax) * realPerPx;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="overflow-hidden rounded-lg border border-border bg-canvas shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-border bg-panel-muted px-4 py-2 text-xs text-ink-muted">
        <span className="font-mono">calibration · click two points, type real distance</span>
        <span className="font-mono tabular-nums">{measured.toFixed(2)} m</span>
      </div>
      <svg viewBox="0 0 700 380" className="block aspect-[16/10] w-full">
        <rect width="700" height="380" fill="#ffffff" />
        <g stroke="#e7e5e4" strokeWidth="1">
          {Array.from({ length: 18 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={380} />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 40} x2={700} y2={i * 40} />
          ))}
        </g>
        <g stroke="#1c1917" strokeWidth="2" fill="none">
          <rect x="80" y="120" width="540" height="200" />
          <line x1="320" y1="120" x2="320" y2="320" />
        </g>

        <g stroke="#dc2626" strokeWidth="2" fill="#dc2626">
          <line x1={ax} y1={ay} x2={bx} y2={by} />
          <circle cx={ax} cy={ay} r="5" stroke="white" strokeWidth="1.5" />
          <circle cx={bx} cy={by} r="5" stroke="white" strokeWidth="1.5" />
          <rect x={(ax + bx) / 2 - 38} y={ay - 30} width="76" height="22" rx="3" />
          <text
            x={(ax + bx) / 2}
            y={ay - 14}
            textAnchor="middle"
            fontSize="13"
            fontFamily="ui-monospace, monospace"
            fill="white"
          >
            {measured.toFixed(2)} m
          </text>
        </g>
      </svg>
    </div>
  );
}

export function FieldVisual() {
  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-sm">
        <div className="border-b border-border bg-panel-muted px-3 py-2 text-xs text-ink-muted">
          <span className="font-mono">desktop · the studio</span>
        </div>
        <div className="aspect-video p-4">
          <MiniPlan />
        </div>
      </div>
      <div className="overflow-hidden rounded-[28px] border-[3px] border-ink bg-canvas shadow-md">
        <div className="border-b border-border bg-panel-muted px-3 py-2 text-center text-[10px] text-ink-muted">
          <span className="font-mono">9:41 · trace.app</span>
        </div>
        <div className="aspect-[9/14] p-3">
          <MiniPlan />
        </div>
      </div>
    </div>
  );
}

function MiniPlan() {
  return (
    <svg viewBox="0 0 300 200" className="h-full w-full">
      <rect width="300" height="200" fill="#ffffff" />
      <g stroke="#1c1917" strokeWidth="1.5" fill="none">
        <rect x="30" y="30" width="240" height="140" />
        <line x1="150" y1="30" x2="150" y2="170" />
        <rect x="50" y="50" width="60" height="50" />
        <rect x="170" y="50" width="80" height="40" />
      </g>
      <g stroke="#dc2626" strokeWidth="1" fill="#dc2626">
        <line x1="30" y1="185" x2="270" y2="185" />
        <text x="150" y="180" textAnchor="middle" fontSize="9" fontFamily="ui-monospace, monospace">
          24.0 m
        </text>
      </g>
      <circle cx="120" cy="80" r="3" fill="var(--cursor-2, #d97706)" />
      <circle cx="120" cy="80" r="7" fill="var(--cursor-2, #d97706)" fillOpacity="0.2" />
    </svg>
  );
}

export function OssVisual() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-ink p-6 font-mono text-[13px] leading-relaxed text-[#a3e635] shadow-md">
      <div className="text-ink-faint">$ git clone https://github.com/leomercier/trace</div>
      <div className="text-[#a3e635]">Cloning into &apos;trace&apos;...</div>
      <div className="text-ink-faint">$ cd trace &amp;&amp; bun install</div>
      <div className="text-[#a3e635]">✓ 312 packages installed in 2.4s</div>
      <div className="text-ink-faint">$ bun run migrate</div>
      <div className="text-[#a3e635]">✓ database ready</div>
      <div className="text-ink-faint">$ bun run dev</div>
      <div className="text-[#a3e635]">▲ Trace ready on http://localhost:3000</div>
      <div className="mt-3 flex gap-2">
        <span className="rounded-sm border border-[#a3e635]/30 px-1.5 py-0.5 text-[11px] text-[#a3e635]">
          MIT
        </span>
        <span className="rounded-sm border border-white/20 px-1.5 py-0.5 text-[11px] text-white/70">
          your data, your servers
        </span>
      </div>
    </div>
  );
}

export function PresenceVisual() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setPulse((p) => p + 1), 1400);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-canvas shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-panel-muted px-3 py-2">
        <span className="font-mono text-xs text-ink-muted">live · 4 in this drawing</span>
        <div className="flex -space-x-1.5">
          {[
            "var(--cursor-1)",
            "var(--cursor-2)",
            "var(--cursor-3)",
            "var(--cursor-4)",
          ].map((c, i) => (
            <span
              key={c}
              className="size-5 rounded-full border-2 border-panel"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="relative aspect-[16/10]">
        <MiniPlan />
        <div
          key={pulse}
          className="pointer-events-none absolute left-[40%] top-[36%] flex items-center gap-1"
          style={{
            animation: "fadein 600ms ease-out",
          }}
        >
          <span className="size-2 rounded-full" style={{ background: "var(--cursor-1)" }} />
          <span className="rounded bg-[var(--cursor-1)] px-1.5 py-0.5 text-[10px] font-medium text-white">
            Aida placed a note
          </span>
        </div>
        <style>{`@keyframes fadein { from { opacity: 0; transform: translateY(-2px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      </div>
    </div>
  );
}
