"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function ShareGate({ slug }: { slug: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/share/${slug}/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Wrong password.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-6 pt-24">
      <h1 className="font-serif text-3xl">This drawing is password-protected</h1>
      <p className="mt-2 text-ink-muted">Enter the password to view.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <div>
          <Label htmlFor="pw">Password</Label>
          <Input
            id="pw"
            type="password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-measure">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
