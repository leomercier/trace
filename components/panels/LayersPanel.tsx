"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  Unlock,
  Plus,
  Trash2,
  FileText,
  Layers,
  X,
  Square,
  SquareDashed,
  Type,
  StickyNote,
  Package,
  Minus,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useEditor } from "@/stores/editorStore";
import type { Note, PlacedItem, Shape } from "@/lib/supabase/types";
import { PageMenu } from "./PageMenu";

interface PageRow {
  id: string;
  name: string;
}

type ItemKind = "drawing" | "frame" | "placed" | "shape" | "note";

interface FlatItem {
  key: string;          // `${kind}:${id}` — stable across types
  kind: ItemKind;
  id: string;
  name: string;
  badge?: string;
  visible: boolean;     // current visible state
  locked?: boolean;
  canLock?: boolean;
  icon: React.ReactNode;
  selectionKind: "drawing" | "frame" | "placed" | "shape" | "note";
}

interface GroupState {
  id: string;
  name: string;
  expanded: boolean;
  childKeys: string[];
}

interface GroupingState {
  groups: Record<string, GroupState>;
  groupOrder: string[];               // ordered group ids at root
  parentOf: Record<string, string>;   // itemKey -> groupId
}

const EMPTY_GROUPING: GroupingState = {
  groups: {},
  groupOrder: [],
  parentOf: {},
};

function storageKey(pageId: string) {
  return `trace:layers-grouping:${pageId}`;
}

function loadGrouping(pageId: string): GroupingState {
  if (typeof window === "undefined") return EMPTY_GROUPING;
  try {
    const raw = window.localStorage.getItem(storageKey(pageId));
    if (!raw) return EMPTY_GROUPING;
    const parsed = JSON.parse(raw) as GroupingState;
    if (!parsed.groups || !parsed.groupOrder || !parsed.parentOf) {
      return EMPTY_GROUPING;
    }
    return parsed;
  } catch {
    return EMPTY_GROUPING;
  }
}

function saveGrouping(pageId: string, g: GroupingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(pageId), JSON.stringify(g));
  } catch {
    // localStorage full / disabled — non-fatal.
  }
}

export function LayersPanel({
  canEdit,
  mobileOpen,
  onMobileClose,
  onUpload,
  onSetVisible,
  onSetLocked,
  onDelete,
  onDeletePlacedItem,
  onDeleteShape,
  onDeleteNote,
  onDeleteFrame,
  onReorderDrawings,
  onReorderPlacedItems,
  onReorderShapes,
  page,
}: {
  canEdit: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onUpload: (f: File) => void;
  onSetVisible: (id: string, visible: boolean) => void;
  /** Persist lock state on a drawing layer. Pass undefined for "primary". */
  onSetLocked: (id: string, locked: boolean) => void;
  onDelete: (id: string) => void;
  onDeletePlacedItem: (id: string) => void;
  onDeleteShape: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteFrame?: (id: string) => void;
  /** Persist a new drawing-layer ordering (bottom-to-top). */
  onReorderDrawings?: (orderedIds: string[]) => void;
  onReorderPlacedItems?: (orderedIds: string[]) => void;
  onReorderShapes?: (orderedIds: string[]) => void;
  page: {
    orgSlug: string;
    projectId: string;
    projectName: string;
    currentPageId: string;
    currentPageName: string;
    pages: PageRow[];
    canAdmin: boolean;
    onDeletePage?: (id: string) => void;
    onRenamePage: (name: string) => void;
  };
}) {
  const drawings = useEditor((s) => s.drawings);
  const placedItems = useEditor((s) => s.placedItems);
  const shapes = useEditor((s) => s.shapes);
  const notes = useEditor((s) => s.notes);
  const frames = useEditor((s) => s.frames);
  const hiddenIds = useEditor((s) => s.hiddenIds);
  const setHidden = useEditor((s) => s.setHidden);
  const selection = useEditor((s) => s.selection);
  const setSelection = useEditor((s) => s.setSelection);

  // Build the unified list of canvas objects.
  const flat: FlatItem[] = useMemo(() => {
    const out: FlatItem[] = [];

    // Drawings (top-of-list = front layer in canvas)
    Object.values(drawings)
      .sort((a, b) => b.sortOrder - a.sortOrder)
      .forEach((d) => {
        out.push({
          key: `drawing:${d.id}`,
          kind: "drawing",
          id: d.id,
          name: d.name,
          badge: d.fileType.toUpperCase(),
          visible: d.visible,
          locked: d.locked,
          canLock: d.id !== "primary",
          icon: <FileText size={12} />,
          selectionKind: "drawing",
        });
      });

    // Frames
    Object.values(frames)
      .sort(
        (a, b) =>
          Number(b.z_order ?? 0) - Number(a.z_order ?? 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .forEach((f) => {
        out.push({
          key: `frame:${f.id}`,
          kind: "frame",
          id: f.id,
          name: f.name,
          badge: `${Math.round(Number(f.w))}×${Math.round(Number(f.h))}`,
          visible: !hiddenIds[f.id],
          icon: <SquareDashed size={12} />,
          selectionKind: "frame",
        });
      });

    // Placed items
    Object.values(placedItems)
      .sort(
        (a, b) =>
          Number(b.z_order ?? 0) - Number(a.z_order ?? 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .forEach((p) => {
        out.push({
          key: `placed:${p.id}`,
          kind: "placed",
          id: p.id,
          name: p.name,
          badge: `${p.width_mm}×${p.depth_mm}`,
          visible: !hiddenIds[p.id],
          icon: <Package size={12} />,
          selectionKind: "placed",
        });
      });

    // Shapes
    Object.values(shapes)
      .sort(
        (a, b) =>
          Number(b.z_order ?? 0) - Number(a.z_order ?? 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .forEach((s) => {
        out.push({
          key: `shape:${s.id}`,
          kind: "shape",
          id: s.id,
          name: shapeLabel(s),
          badge: s.kind.toUpperCase(),
          visible: !hiddenIds[s.id],
          icon: shapeIcon(s),
          selectionKind: "shape",
        });
      });

    // Notes
    Object.values(notes)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .forEach((n) => {
        out.push({
          key: `note:${n.id}`,
          kind: "note",
          id: n.id,
          name: n.text || "Empty note",
          visible: !hiddenIds[n.id],
          icon: <StickyNote size={12} />,
          selectionKind: "note",
        });
      });

    return out;
  }, [drawings, frames, placedItems, shapes, notes, hiddenIds]);

  const flatByKey = useMemo(() => {
    const m = new Map<string, FlatItem>();
    for (const f of flat) m.set(f.key, f);
    return m;
  }, [flat]);

  // Grouping state, persisted per page.
  const [grouping, setGrouping] = useState<GroupingState>(EMPTY_GROUPING);

  useEffect(() => {
    setGrouping(loadGrouping(page.currentPageId));
  }, [page.currentPageId]);

  useEffect(() => {
    saveGrouping(page.currentPageId, grouping);
  }, [page.currentPageId, grouping]);

  // Garbage-collect grouping entries pointing at items that no longer exist.
  useEffect(() => {
    setGrouping((g) => {
      const liveKeys = new Set(flat.map((f) => f.key));
      const nextParents: Record<string, string> = {};
      for (const k of Object.keys(g.parentOf)) {
        if (liveKeys.has(k)) nextParents[k] = g.parentOf[k];
      }
      const nextGroups: Record<string, GroupState> = {};
      for (const id of Object.keys(g.groups)) {
        const grp = g.groups[id];
        const filteredChildren = grp.childKeys.filter((k) => liveKeys.has(k));
        nextGroups[id] = { ...grp, childKeys: filteredChildren };
      }
      return {
        groups: nextGroups,
        groupOrder: g.groupOrder.filter((id) => nextGroups[id]),
        parentOf: nextParents,
      };
    });
  }, [flat]);

  // Compute the rows to render (groups, their children, and ungrouped items).
  const rootItems = flat.filter((f) => !grouping.parentOf[f.key]);

  function createGroup() {
    const id = `g_${Math.random().toString(36).slice(2, 9)}`;
    setGrouping((g) => ({
      groups: { ...g.groups, [id]: { id, name: "New group", expanded: true, childKeys: [] } },
      groupOrder: [id, ...g.groupOrder],
      parentOf: g.parentOf,
    }));
  }

  function deleteGroup(groupId: string) {
    setGrouping((g) => {
      const { [groupId]: removed, ...restGroups } = g.groups;
      const nextParents = { ...g.parentOf };
      if (removed) for (const k of removed.childKeys) delete nextParents[k];
      return {
        groups: restGroups,
        groupOrder: g.groupOrder.filter((id) => id !== groupId),
        parentOf: nextParents,
      };
    });
  }

  function renameGroup(groupId: string, name: string) {
    setGrouping((g) => {
      if (!g.groups[groupId]) return g;
      return {
        ...g,
        groups: { ...g.groups, [groupId]: { ...g.groups[groupId], name } },
      };
    });
  }

  function toggleGroup(groupId: string) {
    setGrouping((g) => {
      if (!g.groups[groupId]) return g;
      return {
        ...g,
        groups: {
          ...g.groups,
          [groupId]: { ...g.groups[groupId], expanded: !g.groups[groupId].expanded },
        },
      };
    });
  }

  function moveItemIntoGroup(itemKey: string, groupId: string | null) {
    setGrouping((g) => {
      const prevParent = g.parentOf[itemKey];
      const nextGroups = { ...g.groups };
      if (prevParent && nextGroups[prevParent]) {
        nextGroups[prevParent] = {
          ...nextGroups[prevParent],
          childKeys: nextGroups[prevParent].childKeys.filter((k) => k !== itemKey),
        };
      }
      const nextParents = { ...g.parentOf };
      if (groupId && nextGroups[groupId]) {
        if (nextGroups[groupId].childKeys.includes(itemKey)) {
          // already a child
          nextParents[itemKey] = groupId;
        } else {
          nextGroups[groupId] = {
            ...nextGroups[groupId],
            childKeys: [...nextGroups[groupId].childKeys, itemKey],
            expanded: true,
          };
          nextParents[itemKey] = groupId;
        }
      } else {
        delete nextParents[itemKey];
      }
      return { ...g, groups: nextGroups, parentOf: nextParents };
    });
  }

  // Drag state. The drag source can be either an item (key=`drawing:id`) or a
  // group (key=`group:id`). Drop targets: another item (reorder before),
  // a group row (move into / reorder before), or root (move out of group).
  const [drag, setDrag] = useState<{
    sourceKey: string;
    sourceKind: "item" | "group";
    overKey: string | null;
  } | null>(null);

  function reorderRoot(sourceKey: string, beforeKey: string | null) {
    // Reorder a root-level node (group or ungrouped item) before another
    // root-level node. We persist canvas-level reordering by kind too, when
    // applicable, so dragging two drawings around the unified list still
    // updates their canvas z-order.
    if (sourceKey === beforeKey) return;
    const isGroupSrc = sourceKey.startsWith("group:");
    if (isGroupSrc) {
      const gid = sourceKey.slice("group:".length);
      setGrouping((g) => {
        const without = g.groupOrder.filter((id) => id !== gid);
        if (!beforeKey || !beforeKey.startsWith("group:")) {
          // dropped before an item or at end: append groups list
          return { ...g, groupOrder: [...without, gid] };
        }
        const beforeGid = beforeKey.slice("group:".length);
        const idx = without.indexOf(beforeGid);
        if (idx < 0) return { ...g, groupOrder: [...without, gid] };
        without.splice(idx, 0, gid);
        return { ...g, groupOrder: without };
      });
      return;
    }
    // Item-level reorder within the same kind only — cross-kind ordering has
    // no canvas meaning. We move it into the same parent context (root) and
    // call the matching kind reorder handler when both items are the same kind.
    const src = flatByKey.get(sourceKey);
    const before = beforeKey ? flatByKey.get(beforeKey) : null;
    if (!src) return;
    moveItemIntoGroup(sourceKey, null);
    if (before && src.kind === before.kind) {
      reorderWithinKind(src.kind, src.id, before.id);
    }
  }

  function reorderWithinKind(kind: ItemKind, fromId: string, beforeId: string) {
    if (fromId === beforeId) return;
    if (kind === "drawing") {
      const ids = Object.values(drawings)
        .sort((a, b) => b.sortOrder - a.sortOrder)
        .map((d) => d.id)
        .filter((id) => id !== fromId);
      const at = ids.indexOf(beforeId);
      if (at < 0) return;
      ids.splice(at, 0, fromId);
      onReorderDrawings?.([...ids].reverse());
    } else if (kind === "placed") {
      const ids = Object.values(placedItems)
        .sort(
          (a, b) =>
            Number(b.z_order ?? 0) - Number(a.z_order ?? 0) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((p) => p.id)
        .filter((id) => id !== fromId);
      const at = ids.indexOf(beforeId);
      if (at < 0) return;
      ids.splice(at, 0, fromId);
      onReorderPlacedItems?.(ids);
    } else if (kind === "shape") {
      const ids = Object.values(shapes)
        .sort(
          (a, b) =>
            Number(b.z_order ?? 0) - Number(a.z_order ?? 0) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((s) => s.id)
        .filter((id) => id !== fromId);
      const at = ids.indexOf(beforeId);
      if (at < 0) return;
      ids.splice(at, 0, fromId);
      onReorderShapes?.(ids);
    }
  }

  function deleteItem(it: FlatItem) {
    if (it.kind === "drawing") {
      if (confirm(`Delete layer "${it.name}"?`)) onDelete(it.id);
    } else if (it.kind === "placed") {
      onDeletePlacedItem(it.id);
    } else if (it.kind === "shape") {
      onDeleteShape(it.id);
    } else if (it.kind === "note") {
      onDeleteNote(it.id);
    } else if (it.kind === "frame" && onDeleteFrame) {
      onDeleteFrame(it.id);
    }
  }

  function toggleVisibility(it: FlatItem) {
    if (it.kind === "drawing") {
      onSetVisible(it.id, !it.visible);
    } else {
      setHidden(it.id, it.visible);
    }
  }

  // Helpers for drag-drop wiring on rows.
  function dragSourceProps(sourceKey: string, sourceKind: "item" | "group") {
    if (!canEdit) return undefined;
    return {
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", sourceKey);
        setDrag({ sourceKey, sourceKind, overKey: null });
      },
      onDragEnd: () => setDrag(null),
    };
  }

  function dragTargetProps(targetKey: string) {
    if (!canEdit) return undefined;
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!drag || drag.sourceKey === targetKey) return;
        e.preventDefault();
        // Stop propagation so a child drop target's overKey doesn't get
        // overwritten by an ancestor's onDragOver firing right after.
        if (targetKey !== "__root__") e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setDrag((d) => (d && d.overKey !== targetKey ? { ...d, overKey: targetKey } : d));
      },
      onDrop: (e: React.DragEvent) => {
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        handleDrop(drag.sourceKey, targetKey);
        setDrag(null);
      },
    };
  }

  function handleDrop(sourceKey: string, targetKey: string) {
    if (sourceKey === targetKey) return;
    if (targetKey.startsWith("group:")) {
      const targetGid = targetKey.slice("group:".length);
      if (sourceKey.startsWith("group:")) {
        // Reorder a group before another group (no nesting of groups).
        reorderRoot(sourceKey, targetKey);
      } else {
        moveItemIntoGroup(sourceKey, targetGid);
      }
      return;
    }
    if (targetKey === "__root__") {
      // Drop onto bare root area — ungroup.
      if (sourceKey.startsWith("group:")) return;
      moveItemIntoGroup(sourceKey, null);
      return;
    }
    // Target is another item key.
    const target = flatByKey.get(targetKey);
    if (!target) return;
    if (sourceKey.startsWith("group:")) {
      reorderRoot(sourceKey, targetKey);
      return;
    }
    const src = flatByKey.get(sourceKey);
    if (!src) return;
    // Move source to be a sibling of target (same parent) and reorder before
    // it when same kind.
    const parentOfTarget = grouping.parentOf[targetKey] || null;
    moveItemIntoGroup(sourceKey, parentOfTarget);
    if (src.kind === target.kind) {
      reorderWithinKind(src.kind, src.id, target.id);
    }
  }

  // Order child keys within a group by the same default ordering used in
  // `flat`, so newly-added items appear in a predictable place.
  function orderedChildren(group: GroupState): FlatItem[] {
    const order = group.childKeys;
    const set = new Set(order);
    const items = flat.filter((f) => set.has(f.key));
    items.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    return items;
  }

  const Body = (
    <>
      {/* Page menu + page name (moved from the top bar). */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <PageMenu
          orgSlug={page.orgSlug}
          projectId={page.projectId}
          projectName={page.projectName}
          currentPageId={page.currentPageId}
          pages={page.pages}
          canEdit={canEdit}
          canAdmin={page.canAdmin}
          onDeletePage={page.onDeletePage}
        />
        <PageNameField
          name={page.currentPageName}
          canEdit={canEdit}
          onRename={page.onRenamePage}
        />
        {onMobileClose ? (
          <button
            onClick={onMobileClose}
            className="rounded p-1 text-ink-muted hover:bg-panel-muted hover:text-ink md:hidden"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-faint">
          <Layers size={13} /> Layers
        </div>
        {canEdit ? (
          <div className="flex items-center gap-1">
            <button
              onClick={createGroup}
              title="New group"
              aria-label="New group"
              className="rounded p-1 text-ink-muted hover:bg-panel-muted hover:text-ink"
            >
              <FolderPlus size={14} />
            </button>
            <label
              title="Add drawing"
              aria-label="Add drawing"
              className="cursor-pointer rounded p-1 text-ink-muted hover:bg-panel-muted hover:text-ink"
            >
              <Plus size={14} />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.currentTarget.files || []);
                  e.currentTarget.value = "";
                  for (const f of files) await onUpload(f);
                }}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div
        className="flex-1 overflow-y-auto p-2"
        {...(dragTargetProps("__root__") || {})}
      >
        {flat.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-ink-muted">
            Nothing on this page yet.
            {canEdit ? (
              <span className="mt-1 block text-[10px]">
                Drop a file or use the toolbar to add items.
              </span>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {grouping.groupOrder.map((gid) => {
              const grp = grouping.groups[gid];
              if (!grp) return null;
              const children = orderedChildren(grp);
              const targetKey = `group:${gid}`;
              const isDropTarget =
                drag?.overKey === targetKey && drag.sourceKey !== targetKey;
              return (
                <li key={targetKey}>
                  <GroupRow
                    group={grp}
                    canEdit={canEdit}
                    isDropTarget={isDropTarget}
                    childCount={children.length}
                    onToggleExpanded={() => toggleGroup(gid)}
                    onRename={(name) => renameGroup(gid, name)}
                    onDelete={() => {
                      if (confirm(`Delete group "${grp.name}"? Items will return to the root list.`)) {
                        deleteGroup(gid);
                      }
                    }}
                    drag={dragSourceProps(targetKey, "group")}
                    target={dragTargetProps(targetKey)}
                  />
                  {grp.expanded ? (
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                      {children.length === 0 ? (
                        <li className="px-2 py-1 text-[10px] italic text-ink-faint">
                          Drop items here
                        </li>
                      ) : (
                        children.map((it) => (
                          <ItemRowWrapper
                            key={it.key}
                            it={it}
                            selection={selection}
                            drag={drag}
                            onSelect={() =>
                              setSelection({ kind: it.selectionKind, id: it.id })
                            }
                            onToggleVisible={() => toggleVisibility(it)}
                            onToggleLocked={
                              canEdit && it.canLock
                                ? () => onSetLocked(it.id, !it.locked)
                                : undefined
                            }
                            onDelete={canEdit ? () => deleteItem(it) : undefined}
                            dragSource={dragSourceProps(it.key, "item")}
                            dragTarget={dragTargetProps(it.key)}
                          />
                        ))
                      )}
                    </ul>
                  ) : null}
                </li>
              );
            })}
            {rootItems.map((it) => (
              <ItemRowWrapper
                key={it.key}
                it={it}
                selection={selection}
                drag={drag}
                onSelect={() => setSelection({ kind: it.selectionKind, id: it.id })}
                onToggleVisible={() => toggleVisibility(it)}
                onToggleLocked={
                  canEdit && it.canLock
                    ? () => onSetLocked(it.id, !it.locked)
                    : undefined
                }
                onDelete={canEdit ? () => deleteItem(it) : undefined}
                dragSource={dragSourceProps(it.key, "item")}
                dragTarget={dragTargetProps(it.key)}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop dock */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-panel md:flex">
        {Body}
      </aside>

      {/* Mobile slide-over */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden" onClick={onMobileClose}>
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            aria-hidden
          />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-panel shadow-lg"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {Body}
          </aside>
        </div>
      ) : null}
    </>
  );
}

function ItemRowWrapper({
  it,
  selection,
  drag,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onDelete,
  dragSource,
  dragTarget,
}: {
  it: FlatItem;
  selection: { kind: string; id: string } | null;
  drag: { sourceKey: string; overKey: string | null } | null;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLocked?: () => void;
  onDelete?: () => void;
  dragSource?: { draggable: true; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void };
  dragTarget?: { onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void };
}) {
  const isSelected =
    selection?.kind === it.selectionKind && selection.id === it.id;
  const dropIndicator = drag?.overKey === it.key && drag.sourceKey !== it.key;
  const isDragSource = drag?.sourceKey === it.key;
  return (
    <Row
      selected={isSelected}
      visible={it.visible}
      onToggleVisible={onToggleVisible}
      locked={it.locked}
      onToggleLocked={onToggleLocked}
      onSelect={onSelect}
      onDelete={onDelete}
      icon={it.icon}
      label={it.name}
      badge={it.badge}
      dragSource={dragSource}
      dragTarget={dragTarget}
      dropIndicator={dropIndicator}
      isDragSource={isDragSource}
    />
  );
}

function GroupRow({
  group,
  canEdit,
  isDropTarget,
  childCount,
  onToggleExpanded,
  onRename,
  onDelete,
  drag,
  target,
}: {
  group: GroupState;
  canEdit: boolean;
  isDropTarget: boolean;
  childCount: number;
  onToggleExpanded: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  drag?: { draggable: true; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void };
  target?: { onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void };
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(group.name);
  useEffect(() => setValue(group.name), [group.name]);
  return (
    <div
      draggable={drag?.draggable}
      onDragStart={drag?.onDragStart}
      onDragEnd={drag?.onDragEnd}
      onDragOver={target?.onDragOver}
      onDrop={target?.onDrop}
      className={`group flex items-center gap-1.5 rounded px-1.5 py-1 text-sm hover:bg-panel-muted ${
        isDropTarget ? "ring-1 ring-ink/40" : ""
      }`}
    >
      <button
        onClick={onToggleExpanded}
        className="text-ink-faint hover:text-ink"
        aria-label={group.expanded ? "Collapse" : "Expand"}
      >
        {group.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      <span className="text-ink-faint">
        {group.expanded ? <FolderOpen size={12} /> : <Folder size={12} />}
      </span>
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setEditing(false);
            const trimmed = value.trim();
            if (trimmed && trimmed !== group.name) onRename(trimmed);
            else setValue(group.name);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setEditing(false);
              setValue(group.name);
            }
          }}
          className="min-w-0 flex-1 rounded bg-panel-muted px-1 text-sm outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => canEdit && setEditing(true)}
          className="min-w-0 flex-1 truncate font-medium"
          title={canEdit ? "Double-click to rename" : group.name}
        >
          {group.name}
        </span>
      )}
      <span className="font-num text-[10px] text-ink-faint">{childCount}</span>
      {canEdit ? (
        <button
          onClick={onDelete}
          title="Delete group"
          aria-label="Delete group"
          className="opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 size={13} className="text-ink-faint hover:text-measure" />
        </button>
      ) : null}
    </div>
  );
}

function Row({
  selected,
  visible,
  onToggleVisible,
  locked,
  onToggleLocked,
  onSelect,
  onDelete,
  icon,
  label,
  badge,
  dragSource,
  dragTarget,
  dropIndicator,
  isDragSource,
}: {
  selected: boolean;
  visible: boolean;
  onToggleVisible: () => void;
  locked?: boolean;
  onToggleLocked?: () => void;
  onSelect: () => void;
  onDelete?: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  dragSource?: { draggable: true; onDragStart: (e: React.DragEvent) => void; onDragEnd: () => void };
  dragTarget?: { onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void };
  dropIndicator: boolean;
  isDragSource: boolean;
}) {
  return (
    <li
      onClick={onSelect}
      draggable={dragSource?.draggable}
      onDragStart={dragSource?.onDragStart}
      onDragEnd={dragSource?.onDragEnd}
      onDragOver={dragTarget?.onDragOver}
      onDrop={dragTarget?.onDrop}
      className={`group relative flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm ${
        selected ? "bg-panel-muted ring-1 ring-ink/20" : "hover:bg-panel-muted"
      } ${dropIndicator ? "ring-1 ring-ink/40" : ""} ${
        isDragSource ? "opacity-50" : ""
      }`}
    >
      {dropIndicator ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-1 -top-px h-0.5 rounded-full bg-ink"
        />
      ) : null}
      {dragSource ? (
        <span
          aria-hidden
          className="-ml-1 cursor-grab text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={12} />
        </span>
      ) : null}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
        title={visible ? "Hide" : "Show"}
        className="text-ink-muted hover:text-ink"
      >
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <span className="shrink-0 text-ink-faint">{icon}</span>
      <span
        className={`min-w-0 flex-1 truncate ${visible ? "" : "text-ink-faint"}`}
        title={label}
      >
        {label}
      </span>
      {badge ? (
        <span className="font-num text-[10px] uppercase text-ink-faint">{badge}</span>
      ) : null}
      {onToggleLocked ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLocked();
          }}
          title={locked ? "Unlock" : "Lock"}
          aria-label={locked ? "Unlock" : "Lock"}
          className={`text-ink-muted hover:text-ink ${
            locked ? "opacity-100" : "opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
          }`}
        >
          {locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      ) : null}
      {onDelete ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
          title="Delete"
          aria-label="Delete"
        >
          <Trash2 size={13} className="text-ink-faint hover:text-measure" />
        </button>
      ) : null}
    </li>
  );
}

function shapeIcon(s: Shape): React.ReactNode {
  if (s.kind === "rect") return <Square size={12} />;
  if (s.kind === "text") return <Type size={12} />;
  return <Minus size={12} />;
}

function shapeLabel(s: Shape): string {
  if (s.kind === "text") return s.text?.trim() || "Text";
  if (s.kind === "rect") return "Rectangle";
  return "Line";
}

function PageNameField({
  name,
  canEdit,
  onRename,
}: {
  name: string;
  canEdit: boolean;
  onRename: (n: string) => void;
}) {
  const [value, setValue] = useState(name);
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value && value !== name) onRename(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
      disabled={!canEdit}
      className="min-w-0 flex-1 truncate bg-transparent font-serif text-base outline-none disabled:text-ink-muted"
      placeholder="Untitled page"
      title={canEdit ? "Rename page" : name}
    />
  );
}
