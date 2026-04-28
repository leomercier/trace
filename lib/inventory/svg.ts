/**
 * SVG silhouettes for default inventory items. Top-down 2D footprints
 * normalised to a 100×100 viewBox. preserveAspectRatio="none" so they stretch
 * to whatever world dimensions the placed item has.
 *
 * Same generators are used both at runtime (to render Pixi sprites) and at
 * seed time (the SQL migration embeds the rendered strings).
 */

export const rectSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5"/></svg>`;

export const sofaSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5" rx="3"/><rect x="2" y="2" width="96" height="22" fill="#f5f5f4" stroke="#1c1917" stroke-width="1.2"/><line x1="35" y1="24" x2="35" y2="98" stroke="#1c1917" stroke-width="0.6"/><line x1="65" y1="24" x2="65" y2="98" stroke="#1c1917" stroke-width="0.6"/></svg>`;

export const armchairSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="4" y="4" width="92" height="92" fill="#fff" stroke="#1c1917" stroke-width="1.5" rx="4"/><rect x="4" y="4" width="92" height="20" fill="#f5f5f4" stroke="#1c1917" stroke-width="1.2"/><rect x="4" y="22" width="14" height="74" fill="#f5f5f4" stroke="#1c1917" stroke-width="1.2"/><rect x="82" y="22" width="14" height="74" fill="#f5f5f4" stroke="#1c1917" stroke-width="1.2"/></svg>`;

export const cabinetSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5"/><line x1="50" y1="2" x2="50" y2="98" stroke="#1c1917" stroke-width="0.5" stroke-dasharray="2 2"/></svg>`;

export const applianceSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5"/><rect x="14" y="14" width="72" height="72" fill="none" stroke="#1c1917" stroke-width="0.8" stroke-dasharray="3 2"/></svg>`;

export const sinkSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5"/><rect x="10" y="14" width="80" height="72" fill="#f5f5f4" stroke="#1c1917" stroke-width="1" rx="3"/><circle cx="50" cy="50" r="4" fill="#1c1917"/></svg>`;

export const bedSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5" rx="2"/><rect x="2" y="2" width="96" height="14" fill="#f5f5f4" stroke="#1c1917" stroke-width="1"/><rect x="14" y="22" width="32" height="20" fill="#fff" stroke="#1c1917" stroke-width="0.6" rx="2"/><rect x="54" y="22" width="32" height="20" fill="#fff" stroke="#1c1917" stroke-width="0.6" rx="2"/></svg>`;

export const bathtubSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5" rx="6"/><rect x="8" y="14" width="84" height="72" fill="#f5f5f4" stroke="#1c1917" stroke-width="1" rx="10"/><circle cx="14" cy="50" r="2" fill="#1c1917"/></svg>`;

export const showerSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5"/><line x1="2" y1="2" x2="98" y2="98" stroke="#1c1917" stroke-width="0.5"/><line x1="98" y1="2" x2="2" y2="98" stroke="#1c1917" stroke-width="0.5"/><circle cx="50" cy="50" r="6" fill="none" stroke="#1c1917" stroke-width="0.8"/></svg>`;

export const toiletSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="20" y="2" width="60" height="22" fill="#fff" stroke="#1c1917" stroke-width="1.5" rx="2"/><ellipse cx="50" cy="62" rx="36" ry="34" fill="#fff" stroke="#1c1917" stroke-width="1.5"/></svg>`;

export const basinSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5" rx="4"/><ellipse cx="50" cy="55" rx="32" ry="28" fill="#f5f5f4" stroke="#1c1917" stroke-width="1"/><circle cx="50" cy="14" r="2" fill="#1c1917"/></svg>`;

export const doorSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="2" y1="98" x2="98" y2="98" stroke="#1c1917" stroke-width="2"/><line x1="2" y1="98" x2="2" y2="2" stroke="#1c1917" stroke-width="1.5"/><path d="M 2 98 A 96 96 0 0 1 98 98" fill="none" stroke="#1c1917" stroke-width="0.6" stroke-dasharray="2 2"/></svg>`;

export const doubleDoorSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="2" y1="98" x2="98" y2="98" stroke="#1c1917" stroke-width="2"/><line x1="2" y1="98" x2="2" y2="50" stroke="#1c1917" stroke-width="1.2"/><line x1="98" y1="98" x2="98" y2="50" stroke="#1c1917" stroke-width="1.2"/><path d="M 2 98 A 48 48 0 0 1 50 50" fill="none" stroke="#1c1917" stroke-width="0.6" stroke-dasharray="2 2"/><path d="M 98 98 A 48 48 0 0 0 50 50" fill="none" stroke="#1c1917" stroke-width="0.6" stroke-dasharray="2 2"/></svg>`;

export const windowSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="40" width="96" height="20" fill="#fff" stroke="#1c1917" stroke-width="1.5"/><line x1="2" y1="50" x2="98" y2="50" stroke="#1c1917" stroke-width="0.6"/><line x1="50" y1="40" x2="50" y2="60" stroke="#1c1917" stroke-width="0.6"/></svg>`;

export const tableSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" fill="#fff" stroke="#1c1917" stroke-width="1.5" rx="4"/></svg>`;

export interface DefaultItem {
  id: string;
  name: string;
  category: "Living" | "Kitchen" | "Bedroom" | "Bathroom" | "Doors";
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  svg: string;
}

export const DEFAULT_ITEMS: DefaultItem[] = [
  // Living
  { id: "sofa-3", name: "3-seat sofa", category: "Living", width_mm: 2200, depth_mm: 950, height_mm: 850, svg: sofaSVG() },
  { id: "sofa-2", name: "2-seat sofa", category: "Living", width_mm: 1600, depth_mm: 900, height_mm: 850, svg: sofaSVG() },
  { id: "armchair", name: "Armchair", category: "Living", width_mm: 850, depth_mm: 900, height_mm: 850, svg: armchairSVG() },
  { id: "coffee-table", name: "Coffee table", category: "Living", width_mm: 1200, depth_mm: 600, height_mm: 400, svg: tableSVG() },
  { id: "tv-unit", name: "TV unit", category: "Living", width_mm: 1800, depth_mm: 450, height_mm: 500, svg: rectSVG() },
  { id: "dining-table-6", name: "Dining table (6)", category: "Living", width_mm: 1800, depth_mm: 900, height_mm: 750, svg: tableSVG() },
  // Kitchen
  { id: "kc-base-600", name: "Base cabinet 600", category: "Kitchen", width_mm: 600, depth_mm: 600, height_mm: 870, svg: cabinetSVG() },
  { id: "kc-base-1000", name: "Base cabinet 1000", category: "Kitchen", width_mm: 1000, depth_mm: 600, height_mm: 870, svg: cabinetSVG() },
  { id: "kc-tall-600", name: "Tall cabinet 600", category: "Kitchen", width_mm: 600, depth_mm: 600, height_mm: 2100, svg: cabinetSVG() },
  { id: "kc-island", name: "Island 1800×900", category: "Kitchen", width_mm: 1800, depth_mm: 900, height_mm: 870, svg: rectSVG() },
  { id: "kc-fridge", name: "Fridge", category: "Kitchen", width_mm: 600, depth_mm: 650, height_mm: 1800, svg: applianceSVG() },
  { id: "kc-oven", name: "Oven 600", category: "Kitchen", width_mm: 600, depth_mm: 600, height_mm: 600, svg: applianceSVG() },
  { id: "kc-sink", name: "Sink 800", category: "Kitchen", width_mm: 800, depth_mm: 500, height_mm: 200, svg: sinkSVG() },
  // Bedroom
  { id: "bed-double", name: "Double bed", category: "Bedroom", width_mm: 1500, depth_mm: 2000, height_mm: 500, svg: bedSVG() },
  { id: "bed-king", name: "King bed", category: "Bedroom", width_mm: 1800, depth_mm: 2000, height_mm: 500, svg: bedSVG() },
  { id: "wardrobe-2", name: "Wardrobe 1000", category: "Bedroom", width_mm: 1000, depth_mm: 600, height_mm: 2000, svg: rectSVG() },
  // Bathroom
  { id: "bath", name: "Bathtub 1700", category: "Bathroom", width_mm: 1700, depth_mm: 700, height_mm: 550, svg: bathtubSVG() },
  { id: "shower", name: "Shower 900×900", category: "Bathroom", width_mm: 900, depth_mm: 900, height_mm: 2000, svg: showerSVG() },
  { id: "toilet", name: "Toilet", category: "Bathroom", width_mm: 400, depth_mm: 700, height_mm: 800, svg: toiletSVG() },
  { id: "basin", name: "Basin 600", category: "Bathroom", width_mm: 600, depth_mm: 450, height_mm: 850, svg: basinSVG() },
  // Doors
  { id: "door-760", name: "Door 760mm", category: "Doors", width_mm: 760, depth_mm: 50, height_mm: 2040, svg: doorSVG() },
  { id: "door-900", name: "Door 900mm", category: "Doors", width_mm: 900, depth_mm: 50, height_mm: 2040, svg: doorSVG() },
  { id: "door-double", name: "Double door", category: "Doors", width_mm: 1500, depth_mm: 50, height_mm: 2040, svg: doubleDoorSVG() },
  { id: "window-1200", name: "Window 1200", category: "Doors", width_mm: 1200, depth_mm: 100, height_mm: 1200, svg: windowSVG() },
];

export const CATEGORIES = ["All", "Living", "Kitchen", "Bedroom", "Bathroom", "Doors"] as const;
