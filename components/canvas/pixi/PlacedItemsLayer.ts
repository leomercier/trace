import * as PIXI from "pixi.js";
import type { PlacedItem } from "@/lib/supabase/types";
import type { Viewport } from "./Viewport";
import { HANDLE_PX, HANDLE_WHITE, SELECTION_BLUE } from "./selection";

const SELECTION_COLOR = SELECTION_BLUE;

interface ItemNode {
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  textureKey: string;
}

const textureCache = new Map<string, PIXI.Texture>();

async function svgToTexture(svg: string, key: string): Promise<PIXI.Texture> {
  const cached = textureCache.get(key);
  if (cached) return cached;
  // Wrap the SVG in a base64 data URL and let Pixi load it.
  const url =
    "data:image/svg+xml;base64," +
    (typeof window === "undefined" ? "" : btoa(unescape(encodeURIComponent(svg))));
  const tex: PIXI.Texture = await PIXI.Assets.load(url);
  textureCache.set(key, tex);
  return tex;
}

function hashSvg(svg: string) {
  let h = 0;
  for (let i = 0; i < svg.length; i++) h = (h * 31 + svg.charCodeAt(i)) | 0;
  return `svg_${h}`;
}

/**
 * Renders all placed inventory items. World dimensions come from
 * width_mm / depth_mm divided by `realPerUnit` (drawing scale). When the
 * page isn't calibrated we fall back to a 1:1 ratio so items still appear
 * — they just won't be at "real" scale.
 */
export class PlacedItemsLayer extends PIXI.Container {
  private nodes = new Map<string, ItemNode>();
  private selectionGfx = new PIXI.Graphics();

  constructor(private viewport: Viewport) {
    super();
    this.label = "placed-items";
    this.eventMode = "passive";
    this.addChild(this.selectionGfx);
  }

  async render(
    items: PlacedItem[],
    selectionId: string | null,
    realPerUnit: number | null,
  ) {
    const seen = new Set<string>();
    const z = this.viewport.zoom || 1;

    for (const item of items) {
      seen.add(item.id);
      let node = this.nodes.get(item.id);
      const textureKey = hashSvg(item.svg_markup);

      if (!node || node.textureKey !== textureKey) {
        if (node) {
          node.container.destroy({ children: true });
          this.nodes.delete(item.id);
        }
        const sprite = new PIXI.Sprite();
        sprite.anchor.set(0.5, 0.5);
        const container = new PIXI.Container();
        container.addChild(sprite);
        container.eventMode = "static";
        container.cursor = "move";
        (container as any).__itemId = item.id;
        this.addChildAt(container, this.children.length - 1); // before selectionGfx
        node = { container, sprite, textureKey };
        this.nodes.set(item.id, node);

        // Async texture load — render placeholder as fallback
        svgToTexture(item.svg_markup, textureKey).then((tex) => {
          if (this.nodes.get(item.id) === node) {
            node!.sprite.texture = tex;
          }
        });
      }

      // World dimensions
      const scale = realPerUnit && realPerUnit > 0 ? realPerUnit : 1;
      const wWorld = item.width_mm / scale;
      const dWorld = item.depth_mm / scale;
      node.sprite.width = wWorld * (Number(item.scale_w) || 1);
      node.sprite.height = dWorld * (Number(item.scale_d) || 1);
      node.container.position.set(Number(item.x), Number(item.y));
      node.container.rotation = ((Number(item.rotation) || 0) * Math.PI) / 180;
    }

    // Remove stale
    for (const [id, node] of this.nodes) {
      if (!seen.has(id)) {
        node.container.destroy({ children: true });
        this.nodes.delete(id);
      }
    }

    // Selection overlay
    this.selectionGfx.clear();
    if (selectionId) {
      const item = items.find((i) => i.id === selectionId);
      const node = this.nodes.get(selectionId);
      if (item && node) {
        const scale = realPerUnit && realPerUnit > 0 ? realPerUnit : 1;
        const wWorld = (item.width_mm / scale) * (Number(item.scale_w) || 1);
        const dWorld = (item.depth_mm / scale) * (Number(item.scale_d) || 1);
        const px = (n: number) => n / z;

        // Bounding box, rotated with the item
        this.selectionGfx.position.set(Number(item.x), Number(item.y));
        this.selectionGfx.rotation = ((Number(item.rotation) || 0) * Math.PI) / 180;
        this.selectionGfx
          .rect(-wWorld / 2, -dWorld / 2, wWorld, dWorld)
          .stroke({
            color: SELECTION_COLOR,
            width: px(1.5),
            pixelLine: false,
          });

        // Four corner resize handles. The active resize math (Canvas.tsx)
        // is uniform-around-centre, so any corner produces the same
        // transform — visually we draw them all so the box reads as
        // resizable from every corner.
        const hx = wWorld / 2;
        const hy = dWorld / 2;
        const corners: [number, number][] = [
          [-hx, -hy],
          [hx, -hy],
          [-hx, hy],
          [hx, hy],
        ];
        for (const [cxh, cyh] of corners) {
          this.selectionGfx
            .rect(
              cxh - px(HANDLE_PX / 2),
              cyh - px(HANDLE_PX / 2),
              px(HANDLE_PX),
              px(HANDLE_PX),
            )
            .fill(HANDLE_WHITE)
            .stroke({ color: SELECTION_COLOR, width: px(1.5) });
        }

        // Rotate handle (small disc above top edge)
        const ry = -dWorld / 2 - px(20);
        this.selectionGfx
          .moveTo(0, -dWorld / 2)
          .lineTo(0, ry)
          .stroke({ color: SELECTION_COLOR, width: px(1) });
        this.selectionGfx
          .circle(0, ry, px(HANDLE_PX / 2))
          .fill(HANDLE_WHITE)
          .stroke({ color: SELECTION_COLOR, width: px(1.5) });
      }
    }
    // Move selection gfx on top
    this.setChildIndex(this.selectionGfx, this.children.length - 1);
  }

  /**
   * Returns the placed item id under the world coordinate, or null.
   * Iterates from topmost down (last drawn = closest to user).
   */
  hitTest(items: PlacedItem[], wx: number, wy: number, realPerUnit: number | null): string | null {
    const scale = realPerUnit && realPerUnit > 0 ? realPerUnit : 1;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const wWorld = (item.width_mm / scale) * (Number(item.scale_w) || 1);
      const dWorld = (item.depth_mm / scale) * (Number(item.scale_d) || 1);
      const cx = Number(item.x);
      const cy = Number(item.y);
      const r = ((Number(item.rotation) || 0) * Math.PI) / 180;
      // Rotate (wx,wy) into the item's local frame
      const dx = wx - cx;
      const dy = wy - cy;
      const lx = dx * Math.cos(-r) - dy * Math.sin(-r);
      const ly = dx * Math.sin(-r) + dy * Math.cos(-r);
      if (Math.abs(lx) <= wWorld / 2 && Math.abs(ly) <= dWorld / 2) {
        return item.id;
      }
    }
    return null;
  }

  /**
   * Returns which handle (if any) is under a world coordinate for the selected
   * item: 'resize' | 'rotate' | null.
   */
  hitHandle(
    item: PlacedItem,
    wx: number,
    wy: number,
    realPerUnit: number | null,
  ): "resize" | "rotate" | null {
    const z = this.viewport.zoom || 1;
    const scale = realPerUnit && realPerUnit > 0 ? realPerUnit : 1;
    const wWorld = (item.width_mm / scale) * (Number(item.scale_w) || 1);
    const dWorld = (item.depth_mm / scale) * (Number(item.scale_d) || 1);
    const cx = Number(item.x);
    const cy = Number(item.y);
    const r = ((Number(item.rotation) || 0) * Math.PI) / 180;
    const dx = wx - cx;
    const dy = wy - cy;
    const lx = dx * Math.cos(-r) - dy * Math.sin(-r);
    const ly = dx * Math.sin(-r) + dy * Math.cos(-r);
    const tol = (HANDLE_PX + 4) / z;
    // Any of the four corners triggers the same uniform-resize math.
    const hx = wWorld / 2;
    const hy = dWorld / 2;
    if (
      (Math.abs(lx - hx) <= tol && Math.abs(ly - hy) <= tol) ||
      (Math.abs(lx + hx) <= tol && Math.abs(ly - hy) <= tol) ||
      (Math.abs(lx - hx) <= tol && Math.abs(ly + hy) <= tol) ||
      (Math.abs(lx + hx) <= tol && Math.abs(ly + hy) <= tol)
    ) {
      return "resize";
    }
    // Rotate handle 20px above top edge
    const ry = -dWorld / 2 - 20 / z;
    if (Math.abs(lx) <= tol && Math.abs(ly - ry) <= tol) return "rotate";
    return null;
  }
}
