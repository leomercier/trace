type Principle = {
  index: string;
  label: string;
  body: string;
};

const PRINCIPLES: Principle[] = [
  {
    index: "01",
    label: "Clarity",
    body: "Nothing hidden. Every layer, token, and decision visible.",
  },
  {
    index: "02",
    label: "Structure",
    body: "Systems over screens. Components are the source of truth.",
  },
  {
    index: "03",
    label: "Precision",
    body: "Every pixel has a reason. Every value has a name.",
  },
  {
    index: "04",
    label: "Openness",
    body: "No black boxes. Source on GitHub. Self-host or use ours.",
  },
];

export function PrinciplesGrid() {
  return (
    <ul className="grid gap-px overflow-hidden rounded-md bg-white/15 md:grid-cols-2">
      {PRINCIPLES.map((p) => (
        <li
          key={p.index}
          className="bg-trace-plum px-6 py-8 transition-colors hover:bg-[#4d1428]"
        >
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
            <span>{p.index}</span>
            <span className="h-px w-6 bg-white/30" />
          </div>
          <h3 className="mt-3 font-display text-2xl font-semibold text-white md:text-3xl">
            {p.label}
          </h3>
          <p className="mt-3 text-white/70">{p.body}</p>
        </li>
      ))}
    </ul>
  );
}
