"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useEditor } from "@/stores/editorStore";
import { Viewport } from "./pixi/Viewport";
import { DrawingLayer } from "./pixi/DrawingLayer";
import { MeasurementLayer } from "./pixi/MeasurementLayer";
import { CursorLayer } from "./pixi/CursorLayer";
import { SnapIndex } from "./pixi/Snapping";

export interface CanvasHandle {
  fitToContent: () => void;
}

export function Canvas({
  onPointerWorld,
  onClickWorld,
  onSelectionPick,
  onCanvasReady,
}: {
  onPointerWorld?: (p: { x: number; y: number; snapped: boolean }) => void;
  onClickWorld?: (p: { x: number; y: number; snapped: boolean }) => void;
  onSelectionPick?: (id: string | null) => void;
  onCanvasReady?: (api: CanvasHandle) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{
    app: PIXI.Application;
    viewport: Viewport;
    drawingLayer: DrawingLayer;
    measureLayer: MeasurementLayer;
    cursorLayer: CursorLayer;
    snapBadge: PIXI.Graphics;
    snap: SnapIndex;
  } | null>(null);

  // Mount Pixi once
  useEffect(() => {
    if (!hostRef.current) return;
    const host = hostRef.current;

    let cancelled = false;
    const app = new PIXI.Application();
    (async () => {
      const rect = host.getBoundingClientRect();
      await app.init({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        background: "#ffffff",
        antialias: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoDensity: true,
      });
      if (cancelled) {
        app.destroy(true, { children: true, texture: true });
        return;
      }
      host.appendChild(app.canvas);

      const viewport = new Viewport(app);
      viewport.setSize(rect.width, rect.height);

      const drawingLayer = new DrawingLayer();
      const measureLayer = new MeasurementLayer(viewport);
      const cursorLayer = new CursorLayer(viewport);
      viewport.world.addChild(drawingLayer);
      viewport.world.addChild(measureLayer);
      viewport.world.addChild(cursorLayer);

      const snapBadge = new PIXI.Graphics();
      snapBadge.visible = false;
      app.stage.addChild(snapBadge);

      apiRef.current = {
        app,
        viewport,
        drawingLayer,
        measureLayer,
        cursorLayer,
        snapBadge,
        snap: new SnapIndex(),
      };

      // Initial transform: center
      viewport.position = { x: rect.width / 2, y: rect.height / 2 };
      viewport.scale = 1;
      pushView();

      onCanvasReady?.({ fitToContent });

      attachInteractions();
      const onResize = () => {
        const r = host.getBoundingClientRect();
        app.renderer.resize(r.width, r.height);
        viewport.setSize(r.width, r.height);
      };
      window.addEventListener("resize", onResize);
      (app as any)._onResize = onResize;
    })();

    return () => {
      cancelled = true;
      const a = apiRef.current;
      if (a) {
        window.removeEventListener("resize", (a.app as any)._onResize);
        a.app.destroy(true, { children: true, texture: true });
      } else {
        try {
          app.destroy(true, { children: true, texture: true });
        } catch {}
      }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to entities and re-render the drawing layer
  useEffect(() => {
    const unsub = useEditor.subscribe((state, prev) => {
      const a = apiRef.current;
      if (!a) return;
      if (state.entities !== prev.entities) {
        a.drawingLayer.render(state.entities);
        a.snap.build(state.entities);
        if (state.bounds) {
          a.viewport.fitTo(state.bounds);
          pushView();
        }
      }
      if (state.bounds !== prev.bounds && state.bounds) {
        a.viewport.fitTo(state.bounds);
        pushView();
      }
      if (
        state.measurements !== prev.measurements ||
        state.scale !== prev.scale ||
        state.selection !== prev.selection
      ) {
        a.measureLayer.render(
          Object.values(state.measurements),
          state.selection?.kind === "measurement" ? state.selection.id : null,
          state.scale,
        );
      }
      if (state.draft !== prev.draft) {
        a.measureLayer.drawDraft(state.draft?.start || null, state.draft?.end || null);
      }
      if (state.cursors !== prev.cursors) {
        // Filter own cursor out
        a.cursorLayer.render(Object.values(state.cursors));
      }
      if (state.view !== prev.view) {
        // Re-render to update counter-scale
        a.measureLayer.render(
          Object.values(state.measurements),
          state.selection?.kind === "measurement" ? state.selection.id : null,
          state.scale,
        );
        a.measureLayer.drawDraft(state.draft?.start || null, state.draft?.end || null);
        a.cursorLayer.render(Object.values(state.cursors));
      }
    });
    return () => unsub();
  }, []);

  function pushView() {
    const a = apiRef.current;
    if (!a) return;
    useEditor.getState().setView({ x: a.viewport.x, y: a.viewport.y, zoom: a.viewport.zoom });
  }

  function fitToContent() {
    const a = apiRef.current;
    const b = useEditor.getState().bounds;
    if (a && b) {
      a.viewport.fitTo(b);
      pushView();
    }
  }

  function attachInteractions() {
    const a = apiRef.current;
    if (!a) return;
    const canvas = a.app.canvas as HTMLCanvasElement;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerDownAt = 0;
    let pointerDownX = 0;
    let pointerDownY = 0;
    const PAN_TOOLS = new Set(["pan"]);

    const SNAP_PX = 8;

    function snapToVertex(world: { x: number; y: number }) {
      const z = a!.viewport.zoom || 1;
      const r = SNAP_PX / z;
      const v = a!.snap.nearest(world.x, world.y, r);
      return v
        ? { x: v.x, y: v.y, snapped: true }
        : { ...world, snapped: false };
    }

    function showSnapBadge(world: { x: number; y: number } | null) {
      if (!world) {
        a!.snapBadge.visible = false;
        return;
      }
      const sc = a!.viewport.worldToScreen(world.x, world.y);
      a!.snapBadge.clear().circle(0, 0, 8).stroke({ color: 0xdc2626, width: 2 });
      a!.snapBadge.position.set(sc.x, sc.y);
      a!.snapBadge.visible = true;
    }

    canvas.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      a!.viewport.zoomAt(sx, sy, factor);
      pushView();
    }, { passive: false });

    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      pointerDownAt = Date.now();
      pointerDownX = sx;
      pointerDownY = sy;
      const tool = useEditor.getState().tool;
      const isPan =
        e.button === 1 || // middle mouse
        (e.pointerType === "mouse" && e.shiftKey) ||
        PAN_TOOLS.has(tool);
      if (isPan || (tool === "select" && e.button === 0)) {
        dragging = isPan;
        lastX = sx;
        lastY = sy;
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (dragging) {
        a!.viewport.pan(sx - lastX, sy - lastY);
        lastX = sx;
        lastY = sy;
        pushView();
        return;
      }
      const world = a!.viewport.screenToWorld(sx, sy);
      const snapped = snapToVertex(world);
      const tool = useEditor.getState().tool;
      if (tool === "measure" || tool === "calibrate") {
        showSnapBadge(snapped.snapped ? snapped : null);
      } else {
        showSnapBadge(null);
      }
      onPointerWorld?.(snapped);
    });

    canvas.addEventListener("pointerup", (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const wasDragging = dragging;
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}

      const dt = Date.now() - pointerDownAt;
      const moved = Math.hypot(sx - pointerDownX, sy - pointerDownY);
      const isClick = !wasDragging && dt < 500 && moved < 6;
      if (!isClick) return;

      const world = a!.viewport.screenToWorld(sx, sy);
      const snapped = snapToVertex(world);
      const tool = useEditor.getState().tool;
      if (tool === "select") {
        const id = pickMeasurement(world);
        onSelectionPick?.(id);
      } else {
        onClickWorld?.(snapped);
      }
    });

    canvas.addEventListener("pointercancel", () => {
      dragging = false;
    });

    // Two-finger pinch zoom (touch)
    const touchPoints = new Map<number, { x: number; y: number }>();
    canvas.addEventListener("touchstart", (e) => {
      for (const t of Array.from(e.touches)) {
        touchPoints.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }, { passive: true });
    canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const ids = Array.from(touchPoints.keys());
      if (ids.length < 2) return;
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const p0 = touchPoints.get(t0.identifier);
      const p1 = touchPoints.get(t1.identifier);
      if (!p0 || !p1) return;
      const prevDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      const curDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const factor = curDist / Math.max(prevDist, 0.0001);
      const rect = canvas.getBoundingClientRect();
      const cx = (t0.clientX + t1.clientX) / 2 - rect.left;
      const cy = (t0.clientY + t1.clientY) / 2 - rect.top;
      a!.viewport.zoomAt(cx, cy, factor);
      pushView();
      touchPoints.set(t0.identifier, { x: t0.clientX, y: t0.clientY });
      touchPoints.set(t1.identifier, { x: t1.clientX, y: t1.clientY });
    }, { passive: false });
    canvas.addEventListener("touchend", (e) => {
      for (const t of Array.from(e.changedTouches)) {
        touchPoints.delete(t.identifier);
      }
    });
  }

  function pickMeasurement(world: { x: number; y: number }): string | null {
    const a = apiRef.current;
    if (!a) return null;
    const z = a.viewport.zoom || 1;
    const tol = 8 / z;
    const tol2 = tol * tol;
    const ms = useEditor.getState().measurements;
    let best: { id: string; d: number } | null = null;
    for (const m of Object.values(ms)) {
      const d = pointSegDist2(world.x, world.y, +m.ax, +m.ay, +m.bx, +m.by);
      if (d < tol2 && (!best || d < best.d)) best = { id: m.id, d };
    }
    return best?.id || null;
  }

  return (
    <div
      ref={hostRef}
      className="pixi-host absolute inset-0 select-none touch-none bg-canvas"
    />
  );
}

function pointSegDist2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}
