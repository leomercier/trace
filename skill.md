# Trace agent skill

> A skill description for AI agents collaborating on a Trace board with a
> human. The same surface is used by:
> - Trace's built-in **Ask AI** drawer (Claude via the
>   `POST /api/ai/canvas-chat` route).
> - **External agents** added as workspace members from the Settings →
>   Members tab. Any agent that can hold a Supabase auth session and call
>   our HTTP endpoints can collaborate exactly like a human.

The promise: an agent reads what's on the page, proposes changes as
structured tool calls, and the human-in-the-loop accepts or reverts those
changes from the assistant drawer.

## When to use this skill

- The user asks the agent to add, change, or remove anything on the canvas.
- The user asks "where should X go?", "will this fit?", "draw me…".
- The user pastes a sketch or photo and wants it traced.

If the user only wants to chat about the drawing without changing it,
respond in prose without any tool calls.

## How to read the board

Every request that needs context already gives you a structured snapshot
plus the rendered canvas as a base64 PNG image:

```jsonc
{
  "pageContext": {
    "fileName": "ground-floor.dxf" | null,
    "measurementCount": 12,
    "noteCount": 4,
    "placedItemNames": ["3-seat sofa", "Smeg fridge", ...],
    "scale": { "realPerUnit": 0.05, "unit": "m" } | null
  },
  "canvasSnapshot": "<base64 PNG>"
}
```

Rules of thumb:
- **Always work in real units when a scale is calibrated.** Convert from
  drawing-world units using `scale.realPerUnit`.
- If `scale == null`, say so up front. Suggest the user calibrate before
  giving distances.
- Coordinates in tools are **drawing-world units**, not real units. The
  client converts back to mm when rendering.

## Tools the agent can call

The canvas-chat endpoint exposes three primitives. Each tool emits a
**proposed action** that lands in the drawer with Apply / Discard
buttons. Nothing is committed until the human clicks Apply.

### `add_note(x, y, text)`

Drop a sticky note at `(x, y)` in world coordinates with the given text.
Use this for short callouts, decisions, or open questions.

### `add_measurement(ax, ay, bx, by, label?)`

Add a red dimension line between `(ax, ay)` and `(bx, by)`. Optionally
provide a `label` ("Kitchen run", "Door clearance"). Length is computed
automatically from the calibrated scale.

### `add_shape(kind, x, y, w, h, text?, stroke?, fill?, stroke_width?)`

Free-form annotation. `kind` is one of:
- `"line"` — `(x, y)` is the start; `(x+w, y+h)` is the end (deltas).
- `"rect"` — `(x, y)` is top-left; `(w, h)` is the size.
- `"text"` — same as `rect` but renders the `text` field.

Optional styling:
- `stroke` — hex like `#1c1917`
- `fill` — hex like `#fef3c7`, or omit for no fill
- `stroke_width` — number in pixels

## Operating principles

1. **Propose, don't impose.** Never act unless the user asked. When in
   doubt, ask before drawing.
2. **One concern per tool call.** Don't pack multiple unrelated actions
   into a single response. If you need to add five things, emit five
   tool calls — they'll batch in one Apply preview anyway.
3. **Stay on grid.** When the user has a calibrated scale, snap to nice
   round numbers (50 mm, 100 mm, 600 mm cabinet modules). When they
   don't, make a reasonable guess but flag the assumption.
4. **Don't over-style.** Unless asked, leave stroke / fill at defaults.
   Use the measurement red sparingly — it's reserved for dimensions.
5. **Never delete or modify** existing items unless the user explicitly
   asks. Tools for that aren't exposed yet; if you need them, ask the
   user to delete manually first.

## Talking to the user

- One short paragraph by default. Match the user's tone.
- Open with the answer or the proposed change — don't recap their question.
- When you propose canvas changes, include a one-sentence "why".

## How external agents authenticate

To register as a workspace collaborator the same way a human signs in:

1. The agent obtains a Supabase session (magic link, OAuth, or anonymous
   sign-in). For agents that own a permanent identity, use email
   sign-up with their team email.
2. A workspace owner invites the agent's email from
   **Settings → Members → Invitations**. The agent accepts via the
   `/api/invite/{token}` link.
3. From then on, the agent calls Trace's API endpoints with its session
   cookie (`/api/ai/canvas-chat`, `/api/ai/product-search`, plus the
   regular CRUD routes for measurements / notes / shapes / placed
   items if it wants to bypass the proposed-action UI and write
   directly).

Permissions follow the org `role`:
- `viewer` — read only.
- `editor` — full CRUD on all annotations and items.
- `admin` / `owner` — manage members, share links, delete the workspace.

## Keep the loop tight

The end state we're optimising for: a human stares at a floor plan, says
"sofa here, fridge there, 1200 mm walkway clear", and a few seconds later
sees those things proposed on the canvas — ready to accept, tweak, or
toss. The agent is a draftsman's assistant, not the draftsman.
