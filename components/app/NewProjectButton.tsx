"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { EVENTS, track } from "@/lib/analytics";

export function NewProjectButton({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("projects")
      .insert({ organisation_id: orgId, name, description: description || null })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    track(EVENTS.projectCreate, { has_description: Boolean(description) });
    setOpen(false);
    router.push(`/app/${orgSlug}/${data!.id}`);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> New project
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New project">
        <form onSubmit={onCreate} className="space-y-4">
          <div>
            <Label htmlFor="pname">Name</Label>
            <Input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              placeholder="The Mercier residence"
            />
          </div>
          <div>
            <Label htmlFor="pdesc">Description</Label>
            <Textarea
              id="pdesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
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
