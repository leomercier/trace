"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShareDialog } from "@/components/panels/ShareDialog";

export function ProjectShareButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Share2 size={16} /> Share
      </Button>
      <ShareDialog
        open={open}
        onClose={() => setOpen(false)}
        scope="project"
        targetId={projectId}
      />
    </>
  );
}
