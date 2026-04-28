"use client";

import { Share2 } from "lucide-react";
import { PageMenu } from "./PageMenu";

interface PageRow {
  id: string;
  name: string;
}

/**
 * Mobile-only bar shown in the editor: hamburger left, page name center,
 * share right. The desktop OrgTopBar (provided by the layout) is hidden on
 * mobile via Tailwind's md: utilities.
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
  onShare,
}: {
  orgSlug: string;
  projectId: string;
  projectName: string;
  currentPageId: string;
  currentPageName: string;
  pages: PageRow[];
  canEdit: boolean;
  canAdmin: boolean;
  onShare?: () => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <PageMenu
          orgSlug={orgSlug}
          projectId={projectId}
          projectName={projectName}
          currentPageId={currentPageId}
          pages={pages}
          canEdit={canEdit}
          canAdmin={canAdmin}
        />
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate font-serif text-base">{currentPageName}</div>
        </div>
        {canAdmin && onShare ? (
          <button
            onClick={onShare}
            aria-label="Share"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-panel hover:border-border-strong"
          >
            <Share2 size={16} />
          </button>
        ) : (
          <span className="w-9" />
        )}
      </div>
    </div>
  );
}
