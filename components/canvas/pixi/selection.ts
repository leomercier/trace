/**
 * Shared selection-chrome constants. Every Pixi selection overlay
 * (placed items, shapes, drawings) reads from here so the editor has
 * one consistent look — blue outline, white-fill square handles.
 *
 * Colour: RGB(69, 151, 247) → 0x4597f7. Picked to read against both
 * the white canvas background and the off-white panel chrome without
 * being confused for a content stroke.
 */

export const SELECTION_BLUE = 0x4597f7;
export const SELECTION_LOCK = 0x9ca3af; // dimmed grey for locked items
export const HANDLE_PX = 9;

export const HANDLE_WHITE = 0xffffff;
