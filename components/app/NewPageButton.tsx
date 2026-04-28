"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

export function NewPageButton({
  projectId,
  orgId,
  orgSlug,
}: {
  projectId: string;
  orgId: string;
  orgSlug: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("pages")
      .insert({ project_id: projectId, name: name || "Untitled page" })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.push(`/app/${orgSlug}/${projectId}/${data!.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> New page
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New page">
        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <Label htmlFor="pgname">Page name</Label>
            <Input
              id="pgname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Ground floor"
            />
          </div>
          {error ? <p className="text-sm text-measure">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
