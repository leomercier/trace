"use client";

import { Layers, SlidersHorizontal } from "lucide-react";
import { PageMenu } from "./PageMenu";

interface PageRow {
  id: string;
  name: string;
}

/**
 * Mobile-only bar shown in the editor:
 *   [hamburger] [layers] [page name] [properties]
 * The right side opens the Inspector slide-over (properties panel); the
 * layers icon opens the Layers slide-over from the left. Hamburger keeps
 * the existing PageMenu (pages, settings, sign out).
 */
export function EditorMobileBar({
  orgSlug,
  projectId,
  projectName,
  currentPageId,
  currentPageName,
  pages,
  canEdit,
  canAdmin,
  onLayers,
  onInspector,
  onDeletePage,
}: {
  orgSlug: string;
  projectId: string;
  projectName: string;
  currentPageId: string;
  currentPageName: string;
  pages: PageRow[];
  canEdit: boolean;
  canAdmin: boolean;
  onLayers: () => void;
  onInspector: () => void;
  onDeletePage?: (id: string) => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur md:hidden">
      <div className="relative flex items-center gap-1.5 px-2 py-2">
        {/* Page name truly centered, behind the button row */}
        <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
          <div className="max-w-[55%] truncate font-serif text-base">
            {currentPageName}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <PageMenu
            orgSlug={orgSlug}
            projectId={projectId}
            projectName={projectName}
            currentPageId={currentPageId}
            pages={pages}
            canEdit={canEdit}
            canAdmin={canAdmin}
            onDeletePage={onDeletePage}
          />
          <button
            onClick={onLayers}
            aria-label="Layers"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-panel hover:border-border-strong"
          >
            <Layers size={16} />
          </button>
        </div>

        <div className="flex-1" />

        <button
          onClick={onInspector}
          aria-label="Properties"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-panel hover:border-border-strong"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
