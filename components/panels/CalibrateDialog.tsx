"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { UNITS, type Unit } from "@/lib/utils/units";

export function CalibrateDialog({
  open,
  onClose,
  rawLength,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  rawLength: number;
  onApply: (real: number, unit: Unit) => void;
}) {
  const [val, setVal] = useState("");
  const [unit, setUnit] = useState<Unit>("mm");

  return (
    <Dialog open={open} onClose={onClose} title="Calibrate scale">
      <p className="text-sm text-ink-muted">
        You drew a line that is{" "}
        <span className="font-num text-ink">{rawLength.toFixed(2)}</span> drawing units long.
        Enter its real-world length.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = parseFloat(val);
          if (!isFinite(n) || n <= 0) return;
          onApply(n, unit);
        }}
        className="mt-5 space-y-4"
      >
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="rl">Real length</Label>
            <Input
              id="rl"
              autoFocus
              type="number"
              step="any"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="2400"
            />
          </div>
          <div>
            <Label htmlFor="ru">Unit</Label>
            <select
              id="ru"
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="h-10 rounded-md border border-border bg-panel px-3 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Apply scale</Button>
        </div>
      </form>
    </Dialog>
  );
}
