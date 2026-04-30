"use client";

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useEditor } from "@/stores/editorStore";
import { Viewport } from "./pixi/Viewport";
import { DrawingLayer } from "./pixi/DrawingLayer";
import { DrawingSelectionLayer, drawingTransform } from "./pixi/DrawingSelectionLayer";
import { MeasurementLayer } from "./pixi/MeasurementLayer";
import { CursorLayer } from "./pixi/CursorLayer";
import { GridLayer } from "./pixi/GridLayer";
import { PlacedItemsLayer } from "./pixi/PlacedItemsLayer";
import { ShapesLayer } from "./pixi/ShapesLayer";
import { FramesLayer } from "./pixi/FramesLayer";
import { SnapIndex } from "./pixi/Snapping";

export interface CanvasHandle {
  fitToContent: () => void;
}

export function Canvas({
  onPointerWorld,
  onClickWorld,
  onSelectionPick,
  onCanvasReady,
  onItemMove,
  onItemResize,
  onItemRotate,
  onItemMoveEnd,
  onDrawingTransform,
  onDrawingTransformEnd,
  onMeasurementLabelMove,
  onMeasurementLabelMoveEnd,
  onFrameCreate,
  onFrameUpdate,
  onFrameUpdateEnd,
}: {
  onPointerWorld?: (p: { x: number; y: number; snapped: boolean }) => void;
  onClickWorld?: (p: { x: number; y: number; snapped: boolean }) => void;
  onSelectionPick?: (
    sel: { kind: "measurement" | "placed" | "shape" | "drawing" | "frame"; id: string } | null,
  ) => void;
  onFrameCreate?: (rect: { x: number; y: number; w: number; h: number }) => void;
  onFrameUpdate?: (
    id: string,
    patch: Partial<{ x: number; y: number; w: number; h: number }>,
  ) => void;
  onFrameUpdateEnd?: (id: string) => void;
  onCanvasReady?: (api: CanvasHandle) => void;
  onItemMove?: (id: string, x: number, y: number) => void;
  onItemResize?: (id: string, scaleW: number, scaleD: number) => void;
  onItemRotate?: (id: string, rotation: number) => void;
  onItemMoveEnd?: (id: string) => void;
  onDrawingTransform?: (
    id: string,
    patch: Partial<{ tx: number; ty: number; scale: number; rotation: number }>,
  ) => void;
  onDrawingTransformEnd?: (id: string) => void;
  onMeasurementLabelMove?: (id: string, dx: number, dy: number) => void;
  onMeasurementLabelMoveEnd?: (id: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tool = useEditor((s) => s.tool);
  const cursorClass = cursorForTool(tool);
  const apiRef = useRef<{
    app: PIXI.Application;
    viewport: Viewport;
    gridLayer: GridLayer;
    drawingLayer: DrawingLayer;
    drawingSelLayer: DrawingSelectionLayer;
    measureLayer: MeasurementLayer;
    placedLayer: PlacedItemsLayer;
    shapesLayer: ShapesLayer;
    framesLayer: FramesLayer;
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

      const gridLayer = new GridLayer(viewport);
      gridLayer.setSize(rect.width, rect.height);
      const drawingLayer = new DrawingLayer();
      const drawingSelLayer = new DrawingSelectionLayer(viewport);
      const placedLayer = new PlacedItemsLayer(viewport);
      const shapesLayer = new ShapesLayer(viewport);
      const measureLayer = new MeasurementLayer(viewport);
      const framesLayer = new FramesLayer(viewport);
      const cursorLayer = new CursorLayer(viewport);
      // Frame backdrops sit between the grid and the drawings so anything
      // placed on the canvas renders inside the frame visually.
      viewport.world.addChild(gridLayer);
      viewport.world.addChild(framesLayer);
      viewport.world.addChild(drawingLayer);
      viewport.world.addChild(drawingSelLayer);
      viewport.world.addChild(placedLayer);
      viewport.world.addChild(shapesLayer);
      viewport.world.addChild(measureLayer);
      viewport.world.addChild(cursorLayer);

      const snapBadge = new PIXI.Graphics();
      snapBadge.visible = false;
      app.stage.addChild(snapBadge);

      apiRef.current = {
        app,
        viewport,
        gridLayer,
        drawingLayer,
        drawingSelLayer,
        placedLayer,
        shapesLayer,
        measureLayer,
        framesLayer,
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
        gridLayer.setSize(r.width, r.height);
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
    const renderGrid = (state: any) => {
      const a = apiRef.current;
      if (!a) return;
      a.gridLayer.visible = !!state.grid?.visible;
      const realPerUnit = state.scale?.realPerUnit ?? 1;
      const cell = (state.grid?.sizeMM || 1000) / (realPerUnit > 0 ? realPerUnit : 1);
      a.gridLayer.render(cell);
    };

    // Auto-fit only the FIRST time drawings show up. After that the
    // viewport stays where the user put it, so dragging/resizing/rotating
    // a drawing isn't immediately undone by a re-fit.
    let hasFitOnce = false;

    const unsub = useEditor.subscribe((state, prev) => {
      const a = apiRef.current;
      if (!a) return;
      if (state.grid !== prev.grid || state.scale !== prev.scale) renderGrid(state);
      if (state.entities !== prev.entities) {
        a.drawingLayer.render(state.entities);
        a.snap.build(state.entities);
        const justLoaded =
          !hasFitOnce && (prev.entities?.length ?? 0) === 0 && state.entities.length > 0;
        if (justLoaded && state.bounds) {
          a.viewport.fitTo(state.bounds);
          pushView();
          hasFitOnce = true;
        }
      }
      if (state.bounds !== prev.bounds && state.bounds && !hasFitOnce) {
        a.viewport.fitTo(state.bounds);
        pushView();
        if (state.entities.length > 0) hasFitOnce = true;
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
      if (
        state.placedItems !== prev.placedItems ||
        state.scale !== prev.scale ||
        state.selection !== prev.selection
      ) {
        a.placedLayer.render(
          Object.values(state.placedItems),
          state.selection?.kind === "placed" ? state.selection.id : null,
          state.scale?.realPerUnit ?? null,
        );
      }
      if (state.shapes !== prev.shapes || state.selection !== prev.selection) {
        a.shapesLayer.render(
          Object.values(state.shapes),
          state.selection?.kind === "shape" ? state.selection.id : null,
        );
      }
      if (
        state.frames !== prev.frames ||
        state.selection !== prev.selection ||
        state.layers.frames !== prev.layers.frames ||
        state.view !== prev.view
      ) {
        a.framesLayer.visible = state.layers.frames;
        a.framesLayer.render(
          Object.values(state.frames),
          state.selection?.kind === "frame" ? state.selection.id : null,
        );
      }
      if (
        state.drawings !== prev.drawings ||
        state.selection !== prev.selection
      ) {
        a.drawingSelLayer.render(
          state.selection?.kind === "drawing"
            ? state.drawings[state.selection.id] || null
            : null,
        );
      }
      if (state.draft !== prev.draft) {
        a.measureLayer.drawDraft(state.draft?.start || null, state.draft?.end || null);
      }
      if (state.cursors !== prev.cursors) {
        a.cursorLayer.render(Object.values(state.cursors));
      }
      if (state.view !== prev.view) {
        renderGrid(state);
        a.measureLayer.render(
          Object.values(state.measurements),
          state.selection?.kind === "measurement" ? state.selection.id : null,
          state.scale,
        );
        a.placedLayer.render(
          Object.values(state.placedItems),
          state.selection?.kind === "placed" ? state.selection.id : null,
          state.scale?.realPerUnit ?? null,
        );
        a.shapesLayer.render(
          Object.values(state.shapes),
          state.selection?.kind === "shape" ? state.selection.id : null,
        );
        a.drawingSelLayer.render(
          state.selection?.kind === "drawing"
            ? state.drawings[state.selection.id] || null
            : null,
        );
        a.measureLayer.drawDraft(state.draft?.start || null, state.draft?.end || null);
        a.cursorLayer.render(Object.values(state.cursors));
      }
      if (state.draft !== prev.draft) {
        const d = state.draft;
        if (d && (d.tool === "line" || d.tool === "rect" || d.tool === "frame")) {
          // Reuse the rect ghost for frame drafts — they're both rectangles
          // and the dashed outline reads as "you're dragging out a region".
          a.shapesLayer.drawDraft(d.tool === "frame" ? "rect" : d.tool, d.start, d.end);
        } else if (
          (prev.draft && (prev.draft.tool === "line" || prev.draft.tool === "rect" || prev.draft.tool === "frame")) &&
          (!d || (d.tool !== "line" && d.tool !== "rect" && d.tool !== "frame"))
        ) {
          a.shapesLayer.drawDraft(null, null, null);
        }
      }
    });
    // initial render
    renderGrid(useEditor.getState());
    return () => unsub();
  }, []);

  function pushView() {
    const a = apiRef.current;
    if (!a) return;
    useEditor.getState().setView({ x: a.viewport.x, y: a.viewport.y, zoom: a.viewport.zoom });
  }

  function fitToContent() {
    const a = apiRef.current;
    if (!a) return;
    const state = useEditor.getState();
    if (state.bounds && Number.isFinite(state.bounds.minX)) {
      a.viewport.fitTo(state.bounds);
    } else {
      // No source drawing yet — try to fit the union of placed items + measurements.
      // If there's nothing to fit either, just centre at origin at 1:1.
      const items = Object.values(state.placedItems);
      const measurements = Object.values(state.measurements);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const it of items) {
        const x = Number(it.x);
        const y = Number(it.y);
        const w = it.width_mm / (state.scale?.realPerUnit || 1);
        const d = it.depth_mm / (state.scale?.realPerUnit || 1);
        minX = Math.min(minX, x - w / 2);
        minY = Math.min(minY, y - d / 2);
        maxX = Math.max(maxX, x + w / 2);
        maxY = Math.max(maxY, y + d / 2);
      }
      for (const m of measurements) {
        minX = Math.min(minX, +m.ax, +m.bx);
        minY = Math.min(minY, +m.ay, +m.by);
        maxX = Math.max(maxX, +m.ax, +m.bx);
        maxY = Math.max(maxY, +m.ay, +m.by);
      }
      if (Number.isFinite(minX) && minX < maxX && minY < maxY) {
        a.viewport.fitTo({ minX, minY, maxX, maxY });
      } else {
        // Empty page — centre on (0,0) at zoom 1
        const r = a.app.renderer;
        a.viewport.position = { x: r.width / 2, y: r.height / 2 };
        a.viewport.scale = 1;
      }
    }
    pushView();
  }

  function attachInteractions() {
    const a = apiRef.current;
    if (!a) return;
    const canvas = a.app.canvas as HTMLCanvasElement;
    const host = hostRef.current;

    function setDraggingClass(active: boolean) {
      if (!host) return;
      if (active) host.classList.add("is-dragging");
      else host.classList.remove("is-dragging");
    }

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerDownAt = 0;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let itemDrag:
      | {
          mode: "move" | "resize" | "rotate";
          id: string;
          startWorld: { x: number; y: number };
          itemStart: { x: number; y: number; scale_w: number; scale_d: number; rotation: number; w_mm: number; d_mm: number };
        }
      | null = null;
    let drawingDrag:
      | {
          mode: "move" | "resize" | "rotate";
          id: string;
          startWorld: { x: number; y: number };
          start: { tx: number; ty: number; scale: number; rotation: number };
        }
      | null = null;
    let labelDrag:
      | {
          id: string;
          startWorld: { x: number; y: number };
          startDx: number;
          startDy: number;
        }
      | null = null;
    let frameDrag:
      | {
          id: string;
          mode: "move" | "tl" | "tr" | "bl" | "br";
          startWorld: { x: number; y: number };
          start: { x: number; y: number; w: number; h: number };
        }
      | null = null;
    let frameDraft:
      | {
          startWorld: { x: number; y: number };
        }
      | null = null;
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
        e.button === 1 ||
        (e.pointerType === "mouse" && e.shiftKey) ||
        PAN_TOOLS.has(tool);

      // Frame tool: click-drag-release to draw a new frame rectangle.
      if (!isPan && tool === "frame" && e.button === 0) {
        const world = a!.viewport.screenToWorld(sx, sy);
        frameDraft = { startWorld: world };
        useEditor
          .getState()
          .setDraft({ tool: "frame", start: world, end: world });
        canvas.setPointerCapture(e.pointerId);
        setDraggingClass(true);
        return;
      }

      // If select tool + a placed item is selected, check for handle/item drag.
      if (!isPan && tool === "select" && e.button === 0) {
        const state = useEditor.getState();
        const world = a!.viewport.screenToWorld(sx, sy);
        const items = Object.values(state.placedItems);
        const realPerUnit = state.scale?.realPerUnit ?? null;

        // Measurement label drag (highest priority — labels render on top).
        const labelHit = a!.measureLayer.hitLabel(world.x, world.y);
        if (labelHit) {
          const m = state.measurements[labelHit];
          if (m) {
            onSelectionPick?.({ kind: "measurement", id: labelHit });
            labelDrag = {
              id: labelHit,
              startWorld: world,
              startDx: Number(m.label_dx ?? 0),
              startDy: Number(m.label_dy ?? 0),
            };
            canvas.setPointerCapture(e.pointerId);
            setDraggingClass(true);
            return;
          }
        }

        // Selected item handle hit test (only if NOT locked)
        if (state.selection?.kind === "placed") {
          const sel = state.placedItems[state.selection.id];
          if (sel && !sel.locked) {
            const handle = a!.placedLayer.hitHandle(sel, world.x, world.y, realPerUnit);
            if (handle) {
              itemDrag = {
                mode: handle,
                id: sel.id,
                startWorld: world,
                itemStart: {
                  x: Number(sel.x),
                  y: Number(sel.y),
                  scale_w: Number(sel.scale_w) || 1,
                  scale_d: Number(sel.scale_d) || 1,
                  rotation: Number(sel.rotation) || 0,
                  w_mm: sel.width_mm,
                  d_mm: sel.depth_mm,
                },
              };
              canvas.setPointerCapture(e.pointerId);
              setDraggingClass(true);
              return;
            }
          }
        }
        // Plain click on an item.
        const hit = a!.placedLayer.hitTest(items, world.x, world.y, realPerUnit);
        if (hit) {
          const item = state.placedItems[hit];
          // Shift-click: toggle membership in the multi-selection (and make
          // it the primary selection if nothing is selected yet).
          if (e.shiftKey) {
            if (!state.selection || state.selection.kind !== "placed") {
              onSelectionPick?.({ kind: "placed", id: hit });
            } else if (state.selection.id !== hit) {
              useEditor.getState().toggleMultiSelection(hit);
            }
            return;
          }
          onSelectionPick?.({ kind: "placed", id: hit });
          // Locked items can't be dragged — just selected.
          if (item.locked) return;
          itemDrag = {
            mode: "move",
            id: hit,
            startWorld: world,
            itemStart: {
              x: Number(item.x),
              y: Number(item.y),
              scale_w: Number(item.scale_w) || 1,
              scale_d: Number(item.scale_d) || 1,
              rotation: Number(item.rotation) || 0,
              w_mm: item.width_mm,
              d_mm: item.depth_mm,
            },
          };
          canvas.setPointerCapture(e.pointerId);
          setDraggingClass(true);
          return;
        }

        // Drawing layer manipulation. If a drawing is currently selected,
        // its handles take priority over a fresh hit-test so the user can
        // resize/rotate without the click being intercepted by another
        // drawing it overlaps.
        if (state.selection?.kind === "drawing") {
          const sel = state.drawings[state.selection.id];
          if (sel && !sel.locked) {
            const handle = a!.drawingSelLayer.hitHandle(sel, world.x, world.y);
            if (handle) {
              drawingDrag = {
                mode: handle,
                id: sel.id,
                startWorld: world,
                start: {
                  tx: sel.tx || 0,
                  ty: sel.ty || 0,
                  scale: sel.scale || 1,
                  rotation: sel.rotation || 0,
                },
              };
              canvas.setPointerCapture(e.pointerId);
              setDraggingClass(true);
              return;
            }
          }
        }

        // Frame: corner-handle resize for the currently-selected frame, then
        // body click for any frame. Frames sit BEHIND drawings/items so a
        // body click loses to those when overlapping — exactly what we want
        // for "the frame is just a backdrop".
        if (state.selection?.kind === "frame") {
          const sel = state.frames[state.selection.id];
          if (sel && !sel.locked) {
            const handle = a!.framesLayer.hitHandle(world.x, world.y);
            if (handle && handle.id === sel.id) {
              frameDrag = {
                id: sel.id,
                mode: handle.corner,
                startWorld: world,
                start: {
                  x: Number(sel.x),
                  y: Number(sel.y),
                  w: Number(sel.w),
                  h: Number(sel.h),
                },
              };
              canvas.setPointerCapture(e.pointerId);
              setDraggingClass(true);
              return;
            }
          }
        }

        // Plain click on a drawing layer.
        const drawingHit = a!.drawingSelLayer.hitTest(
          Object.values(state.drawings),
          world.x,
          world.y,
        );
        if (drawingHit) {
          const drawing = state.drawings[drawingHit];
          onSelectionPick?.({ kind: "drawing", id: drawingHit });
          if (!drawing || drawing.locked) return;
          drawingDrag = {
            mode: "move",
            id: drawingHit,
            startWorld: world,
            start: {
              tx: drawing.tx || 0,
              ty: drawing.ty || 0,
              scale: drawing.scale || 1,
              rotation: drawing.rotation || 0,
            },
          };
          canvas.setPointerCapture(e.pointerId);
          setDraggingClass(true);
          return;
        }

        // Frame body click — last fallback so other elements take priority.
        const frameHit = a!.framesLayer.hitFrame(world.x, world.y);
        if (frameHit) {
          const frame = state.frames[frameHit];
          onSelectionPick?.({ kind: "frame", id: frameHit });
          if (!frame || frame.locked) return;
          frameDrag = {
            id: frameHit,
            mode: "move",
            startWorld: world,
            start: {
              x: Number(frame.x),
              y: Number(frame.y),
              w: Number(frame.w),
              h: Number(frame.h),
            },
          };
          canvas.setPointerCapture(e.pointerId);
          setDraggingClass(true);
          return;
        }
      }

      if (isPan || (tool === "select" && e.button === 0)) {
        dragging = isPan;
        lastX = sx;
        lastY = sy;
        canvas.setPointerCapture(e.pointerId);
        if (isPan) setDraggingClass(true);
      }
    });

    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (labelDrag) {
        const world = a!.viewport.screenToWorld(sx, sy);
        const dx = world.x - labelDrag.startWorld.x;
        const dy = world.y - labelDrag.startWorld.y;
        onMeasurementLabelMove?.(
          labelDrag.id,
          labelDrag.startDx + dx,
          labelDrag.startDy + dy,
        );
        return;
      }

      if (frameDraft) {
        const world = a!.viewport.screenToWorld(sx, sy);
        useEditor.getState().setDraft({
          tool: "frame",
          start: frameDraft.startWorld,
          end: world,
        });
        return;
      }

      if (frameDrag) {
        const world = a!.viewport.screenToWorld(sx, sy);
        const dx = world.x - frameDrag.startWorld.x;
        const dy = world.y - frameDrag.startWorld.y;
        if (frameDrag.mode === "move") {
          onFrameUpdate?.(frameDrag.id, {
            x: frameDrag.start.x + dx,
            y: frameDrag.start.y + dy,
          });
        } else {
          // Corner resize: keep the opposite corner anchored.
          let { x, y, w, h } = frameDrag.start;
          if (frameDrag.mode === "tl") {
            x = frameDrag.start.x + dx;
            y = frameDrag.start.y + dy;
            w = frameDrag.start.w - dx;
            h = frameDrag.start.h - dy;
          } else if (frameDrag.mode === "tr") {
            y = frameDrag.start.y + dy;
            w = frameDrag.start.w + dx;
            h = frameDrag.start.h - dy;
          } else if (frameDrag.mode === "bl") {
            x = frameDrag.start.x + dx;
            w = frameDrag.start.w - dx;
            h = frameDrag.start.h + dy;
          } else {
            w = frameDrag.start.w + dx;
            h = frameDrag.start.h + dy;
          }
          // Flip when dragging past the opposite corner.
          if (w < 0) {
            x += w;
            w = -w;
          }
          if (h < 0) {
            y += h;
            h = -h;
          }
          onFrameUpdate?.(frameDrag.id, { x, y, w, h });
        }
        return;
      }

      if (drawingDrag) {
        const world = a!.viewport.screenToWorld(sx, sy);
        const drawing = useEditor.getState().drawings[drawingDrag.id];
        if (!drawing) return;
        // Drawing centre in world space, using the *start* transform so
        // the pivot doesn't drift mid-drag.
        const cxNat = (drawing.bounds.minX + drawing.bounds.maxX) / 2;
        const cyNat = (drawing.bounds.minY + drawing.bounds.maxY) / 2;
        const cx = cxNat + drawingDrag.start.tx;
        const cy = cyNat + drawingDrag.start.ty;

        if (drawingDrag.mode === "move") {
          const dx = world.x - drawingDrag.startWorld.x;
          const dy = world.y - drawingDrag.startWorld.y;
          onDrawingTransform?.(
            drawingDrag.id,
            drawingTransform.move(drawingDrag.start, dx, dy),
          );
        } else if (drawingDrag.mode === "resize") {
          // Convert pointer into local space at the drawing's start
          // rotation, ignoring the live rotation so we don't fight the
          // user mid-drag.
          const r = (drawingDrag.start.rotation * Math.PI) / 180;
          const ddx = world.x - cx;
          const ddy = world.y - cy;
          const lx = ddx * Math.cos(-r) - ddy * Math.sin(-r);
          const ly = ddx * Math.sin(-r) + ddy * Math.cos(-r);
          onDrawingTransform?.(
            drawingDrag.id,
            drawingTransform.resize(drawingDrag.start, drawing.bounds, lx, ly),
          );
        } else if (drawingDrag.mode === "rotate") {
          let patch = drawingTransform.rotate({ x: cx, y: cy }, world.x, world.y);
          if (e.shiftKey && patch.rotation !== undefined) {
            patch = { rotation: Math.round(patch.rotation / 15) * 15 };
          }
          onDrawingTransform?.(drawingDrag.id, patch);
        }
        return;
      }

      if (itemDrag) {
        const world = a!.viewport.screenToWorld(sx, sy);
        const dx = world.x - itemDrag.startWorld.x;
        const dy = world.y - itemDrag.startWorld.y;
        if (itemDrag.mode === "move") {
          onItemMove?.(itemDrag.id, itemDrag.itemStart.x + dx, itemDrag.itemStart.y + dy);
        } else if (itemDrag.mode === "resize") {
          // Convert drag in world space into the item's local frame.
          const r = (itemDrag.itemStart.rotation * Math.PI) / 180;
          const lx = dx * Math.cos(-r) - dy * Math.sin(-r);
          const ly = dx * Math.sin(-r) + dy * Math.cos(-r);
          const realPerUnit = useEditor.getState().scale?.realPerUnit ?? 1;
          const baseW = itemDrag.itemStart.w_mm / realPerUnit;
          const baseD = itemDrag.itemStart.d_mm / realPerUnit;
          // Resize by enlarging both edges symmetrically about centre.
          const newSW = Math.max(0.1, itemDrag.itemStart.scale_w + (lx * 2) / baseW);
          const newSD = Math.max(0.1, itemDrag.itemStart.scale_d + (ly * 2) / baseD);
          // Aspect-ratio lock: the inspector chain icon flips a per-item
          // flag; Shift inverts the live mode so a momentary keypress can
          // override either preset without changing the persisted setting.
          const sticky = !!useEditor.getState().aspectLockedItems[itemDrag.id];
          const aspectLock = sticky !== e.shiftKey;
          if (aspectLock) {
            const startRatio =
              itemDrag.itemStart.scale_d === 0
                ? 1
                : itemDrag.itemStart.scale_w / itemDrag.itemStart.scale_d;
            // Pick whichever axis the user dragged more, project the other
            // to maintain the original W:D.
            const dW = Math.abs(newSW - itemDrag.itemStart.scale_w);
            const dD = Math.abs(newSD - itemDrag.itemStart.scale_d);
            let sW: number;
            let sD: number;
            if (dW >= dD) {
              sW = newSW;
              sD = startRatio === 0 ? newSW : sW / startRatio;
            } else {
              sD = newSD;
              sW = sD * startRatio;
            }
            onItemResize?.(itemDrag.id, Math.max(0.1, sW), Math.max(0.1, sD));
          } else {
            onItemResize?.(itemDrag.id, newSW, newSD);
          }
        } else if (itemDrag.mode === "rotate") {
          const cx = itemDrag.itemStart.x;
          const cy = itemDrag.itemStart.y;
          const angleNow = Math.atan2(world.y - cy, world.x - cx);
          // Top of item is at angle = -PI/2 in canvas terms.
          let degrees = ((angleNow + Math.PI / 2) * 180) / Math.PI;
          if (e.shiftKey) degrees = Math.round(degrees / 15) * 15;
          onItemRotate?.(itemDrag.id, degrees);
        }
        return;
      }

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
      // Hover affordance for the draggable measurement label.
      if (tool === "select") {
        const overLabel = a!.measureLayer.hitLabel(world.x, world.y);
        canvas.style.cursor = overLabel ? "grab" : "";
      }
      onPointerWorld?.(snapped);
    });

    canvas.addEventListener("pointerup", (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const wasDragging = dragging;
      const wasItemDrag = itemDrag;
      const wasDrawingDrag = drawingDrag;
      const wasLabelDrag = labelDrag;
      const wasFrameDrag = frameDrag;
      const wasFrameDraft = frameDraft;
      dragging = false;
      itemDrag = null;
      drawingDrag = null;
      labelDrag = null;
      frameDrag = null;
      frameDraft = null;
      setDraggingClass(false);
      try { canvas.releasePointerCapture(e.pointerId); } catch {}

      if (wasFrameDraft) {
        // Commit the dragged-out frame rect. Discard zero-size drags so a
        // mis-click doesn't stamp a 0×0 frame on the page.
        const world = a!.viewport.screenToWorld(sx, sy);
        const x = Math.min(wasFrameDraft.startWorld.x, world.x);
        const y = Math.min(wasFrameDraft.startWorld.y, world.y);
        const w = Math.abs(world.x - wasFrameDraft.startWorld.x);
        const h = Math.abs(world.y - wasFrameDraft.startWorld.y);
        useEditor.getState().setDraft(null);
        if (w > 0.5 && h > 0.5) onFrameCreate?.({ x, y, w, h });
        return;
      }
      if (wasFrameDrag) {
        onFrameUpdateEnd?.(wasFrameDrag.id);
        return;
      }
      if (wasLabelDrag) {
        onMeasurementLabelMoveEnd?.(wasLabelDrag.id);
        return;
      }
      if (wasItemDrag) {
        onItemMoveEnd?.(wasItemDrag.id);
        return;
      }
      if (wasDrawingDrag) {
        onDrawingTransformEnd?.(wasDrawingDrag.id);
        return;
      }

      const dt = Date.now() - pointerDownAt;
      const moved = Math.hypot(sx - pointerDownX, sy - pointerDownY);
      const isClick = !wasDragging && dt < 500 && moved < 6;
      if (!isClick) return;

      const world = a!.viewport.screenToWorld(sx, sy);
      const snapped = snapToVertex(world);
      const tool = useEditor.getState().tool;
      if (tool === "select") {
        const state = useEditor.getState();
        const items = Object.values(state.placedItems);
        const realPerUnit = state.scale?.realPerUnit ?? null;
        const itemHit = a!.placedLayer.hitTest(items, world.x, world.y, realPerUnit);
        if (itemHit) {
          onSelectionPick?.({ kind: "placed", id: itemHit });
          return;
        }
        const shapeHit = a!.shapesLayer.hitTest(
          Object.values(state.shapes),
          world.x,
          world.y,
        );
        if (shapeHit) {
          onSelectionPick?.({ kind: "shape", id: shapeHit });
          return;
        }
        const mid = pickMeasurement(world);
        if (mid) {
          onSelectionPick?.({ kind: "measurement", id: mid });
          return;
        }
        // Lowest priority: drawings sit beneath the other entities, so
        // they only get selected when nothing else is hit.
        const drawingHit = a!.drawingSelLayer.hitTest(
          Object.values(state.drawings),
          world.x,
          world.y,
        );
        onSelectionPick?.(drawingHit ? { kind: "drawing", id: drawingHit } : null);
      } else {
        onClickWorld?.(snapped);
      }
    });

    canvas.addEventListener("pointercancel", () => {
      dragging = false;
      itemDrag = null;
      drawingDrag = null;
      labelDrag = null;
      setDraggingClass(false);
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
      data-tool={tool}
      className={`pixi-host absolute inset-0 select-none touch-none bg-canvas ${cursorClass}`}
    />
  );
}

// `data-tool="pan"` cursors are owned by globals.css so the dragging
// flip works through pointer-capture. For the other tools, a plain
// Tailwind cursor utility on the host is enough.
function cursorForTool(tool: string): string {
  switch (tool) {
    case "pan":
      return "";
    case "measure":
    case "calibrate":
    case "line":
    case "rect":
    case "frame":
      return "cursor-crosshair";
    case "note":
    case "text":
      return "cursor-text";
    default:
      return "cursor-default";
  }
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
