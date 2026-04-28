import { cn } from "@/lib/utils/cn";

export function Avatar({
  name,
  src,
  size = 28,
  className,
  color,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  color?: string;
}) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const bg = color || stringToColor(name);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white font-medium",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4, background: bg }}
    >
      {initials || "?"}
    </span>
  );
}

export function stringToColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const palette = [
    "#1c1917",
    "#dc2626",
    "#0891b2",
    "#7c3aed",
    "#16a34a",
    "#d97706",
    "#0ea5e9",
    "#be123c",
  ];
  return palette[Math.abs(h) % palette.length];
}
