export type Unit = "mm" | "cm" | "m" | "in" | "ft";

export const UNITS: Unit[] = ["mm", "cm", "m", "in", "ft"];

const TO_MM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

export function toMM(value: number, unit: Unit) {
  return value * TO_MM[unit];
}

export function fromMM(valueMM: number, unit: Unit) {
  return valueMM / TO_MM[unit];
}

export function formatLength(realMM: number, unit: Unit) {
  const v = fromMM(realMM, unit);
  if (unit === "mm") return `${Math.round(v)} mm`;
  if (unit === "cm") return `${v.toFixed(1)} cm`;
  if (unit === "m") return `${v.toFixed(3)} m`;
  if (unit === "in") return `${v.toFixed(2)} in`;
  if (unit === "ft") {
    const ft = Math.floor(v);
    const inches = (v - ft) * 12;
    return `${ft}' ${inches.toFixed(1)}"`;
  }
  return `${v}`;
}
