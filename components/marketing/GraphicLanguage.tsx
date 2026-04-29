type Item = {
  title: string;
  body: string;
  visual: () => JSX.Element;
};

const ITEMS: Item[] = [
  {
    title: "Paths",
    body: "Vector lines with anchor points. They show how things connect.",
    visual: () => (
      <svg viewBox="0 0 120 60" className="h-full w-full">
        <path
          d="M 8 30 C 30 8, 60 52, 90 30 S 110 12, 112 30"
          fill="none"
          stroke="var(--trace-black)"
          strokeWidth="2"
        />
        {[
          [8, 30],
          [40, 22],
          [80, 38],
          [112, 30],
        ].map(([x, y], i) => (
          <rect
            key={i}
            x={x - 2}
            y={y - 2}
            width="4"
            height="4"
            fill="white"
            stroke="var(--trace-black)"
            strokeWidth="1.2"
          />
        ))}
      </svg>
    ),
  },
  {
    title: "Nodes",
    body: "Connection points. Where decisions meet.",
    visual: () => (
      <svg viewBox="0 0 120 60" className="h-full w-full">
        <line x1="20" y1="30" x2="60" y2="30" stroke="var(--trace-black)" strokeWidth="1.5" />
        <line x1="60" y1="30" x2="100" y2="14" stroke="var(--trace-black)" strokeWidth="1.5" />
        <line x1="60" y1="30" x2="100" y2="46" stroke="var(--trace-black)" strokeWidth="1.5" />
        {[
          [20, 30],
          [60, 30],
          [100, 14],
          [100, 46],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="4"
            fill="var(--trace-black)"
          />
        ))}
      </svg>
    ),
  },
  {
    title: "Layers",
    body: "Offset duplicates. Versions, hierarchy, state.",
    visual: () => (
      <svg viewBox="0 0 120 60" className="h-full w-full">
        <rect x="20" y="22" width="60" height="28" fill="white" stroke="var(--trace-black)" strokeWidth="1.5" />
        <rect x="28" y="16" width="60" height="28" fill="white" stroke="var(--trace-black)" strokeWidth="1.5" />
        <rect x="36" y="10" width="60" height="28" fill="white" stroke="var(--trace-black)" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    title: "Fragments",
    body: "Cropped UI. The system grounded in real product.",
    visual: () => (
      <svg viewBox="0 0 120 60" className="h-full w-full">
        <g>
          <rect x="14" y="18" width="50" height="24" rx="3" fill="var(--trace-black)" />
          <rect x="68" y="18" width="40" height="24" rx="3" fill="white" stroke="var(--trace-black)" strokeWidth="1.5" />
          <line x1="0" y1="42" x2="120" y2="42" stroke="var(--trace-black)" strokeWidth="0.8" strokeDasharray="3 3" />
        </g>
      </svg>
    ),
  },
];

export function GraphicLanguage() {
  return (
    <ul className="grid gap-px overflow-hidden rounded-md bg-trace-black/15 md:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((item) => (
        <li key={item.title} className="bg-trace-lime p-6">
          <div className="flex h-20 items-center justify-center">
            <item.visual />
          </div>
          <h4 className="mt-4 font-display text-lg font-semibold text-trace-black">
            {item.title}
          </h4>
          <p className="mt-1 text-sm text-trace-black/70">{item.body}</p>
        </li>
      ))}
    </ul>
  );
}
