# CLAUDE.md — Project guide for Claude Code sessions

This file gives future Claude (and human) sessions the load-bearing
context that isn't obvious from the code alone. Read it before making
non-trivial changes.

## What is Trace?

Trace is a browser-based collaborative canvas for measuring and
annotating drawings — DWG, DXF, PDF, SVG, PNG, JPG, WEBP, GIF, BMP.
The intended user is an interior designer / architect / fabricator who
needs to drop a floor plan, calibrate it to real units, place
furniture, and ship a marked-up version to a client or collaborator.

Strategic positioning: "Figma for measured drawings". The goal is the
ergonomic feel of Figma (live cursors, optimistic edits, free-tier
sharing via password-protected links) plus a measure-first toolset that
generic whiteboards don't have.

## Stack

- **Framework**: Next.js 14 App Router, React 18, TypeScript strict.
- **Runtime**: Bun (`bun install`, `bun dev`, `bun run typecheck`).
- **Database/auth/storage/realtime**: Supabase. RLS-enforced multi-tenancy.
- **Canvas**: PixiJS v8. The canvas is one Pixi `Application` mounted
  inside a host `<div>` with sub-layers for grid, parsed drawing,
  measurements, placed items, shapes, cursors.
- **State**: Zustand (`stores/editorStore.ts`) holds the entire editor
  state. The Pixi layers subscribe and render diffs.
- **Styling**: Tailwind + CSS variables (`styles/tokens.css`). No
  shadcn / ad-hoc gradients — the design language is restrained.
- **Fonts**: Geist Sans + Geist Mono via `geist`, Caveat for sticky
  notes via `next/font/google`.
- **Icons**: Hugeicons (free set) wrapped in
  `components/ui/Icon.tsx`. Lucide is used in places we haven't
  migrated yet — prefer Hugeicons for new work.
- **AI**: `@anthropic-ai/sdk`. Used for the in-canvas assistant and
  inventory search.

## Layout

```
app/                            Next.js routes (App Router)
  layout.tsx                    Root layout — fonts + AnalyticsProvider
  (marketing)/page.tsx          Marketing home
  (auth)/{login,signup}         Magic-link + Google OAuth
  app/[orgSlug]/[projectId]/[pageId]/  THE EDITOR
  api/                          Server routes (orgs, invites, shares, AI)

components/
  canvas/Editor.tsx             Top-level editor wrapper. Owns data
                                lifecycle (initial load → store init,
                                realtime sub, file uploads, drag/drop,
                                keyboard).
  canvas/Canvas.tsx             Pixi mount + interaction loop
                                (pointerdown/move/up/wheel, snapping,
                                hit-testing).
  canvas/pixi/{*Layer}.ts       One file per Pixi layer.
  panels/Toolbar.tsx            Bottom-centre tool dock (V/H/M/N/T/L/R/C).
  panels/LayersPanel.tsx        Left panel: page header + every
                                asset type (drawings/items/shapes/notes).
  panels/Inspector.tsx          Right panel: action header + scale,
                                grid, layers toggles, selection
                                properties, measurements list, export.
  panels/EditorActions.tsx      Action header: Inventory / Ask AI /
                                Share / Presence / Profile menu.
  panels/EditorMobileBar.tsx    Mobile-only top bar.
  panels/PageMenu.tsx           Hamburger menu — pages list, settings,
                                sign-out. Embedded in LayersPanel
                                header.

stores/editorStore.ts           Zustand store. Includes drawings (raw
                                parsed entities), placed items,
                                shapes, notes, measurements, view,
                                tool, selection, multi-selection,
                                cursors, layers visibility, grid.

lib/
  analytics/index.ts            GA + Mixpanel wrapper. `track()`,
                                `identify()`, `pageView()`.
  realtime/page.ts              Postgres-changes + broadcast +
                                presence wiring for one page.
  supabase/{client,server}.ts   Per-context clients (browser, route
                                handler, RSC).
  utils/*.ts                    Geometry, units, slug, cn, IDB cache,
                                DWG converter, sanitiseSvg.
```

## State + sync model

- All annotations live in Zustand by row-UUID maps.
- Mutations are **optimistic**: write to the store, then upsert to
  Supabase. On error: surface the error, undo the local insert.
- Realtime: `lib/realtime/page.ts` subscribes to postgres-changes for
  the page's measurements/notes/placed_items/shapes, plus broadcast
  channels for cursors and in-progress draft lines.
- Conflict resolution: last-write-wins per row UUID. Different rows
  never conflict.

## Permissions

- Org-scoped roles: `owner | admin | editor | viewer`.
- Source of truth: Supabase RLS (see
  `supabase/migrations/0002_rls.sql`).
- The UI hides edit affordances for viewers but trusts RLS.
- Public sharing: server-only routes under `app/api/share/[slug]/*`
  bypass RLS via the service-role key, gated by an HMAC cookie set
  after a correct password.

## Conventions and gotchas

- **No CRUD-stub hooks**: write to Supabase directly from Editor.tsx
  using the optimistic pattern already established. Don't wrap things
  in `useMutation` etc.
- **DXF for new code**: DWG is converted to DXF in the browser at
  upload time (`lib/utils/dwg.ts`); everything downstream sees DXF.
- **Drawings can be transformed**: each drawing has its own
  `(tx, ty, scale, rotation)` tuple. The store recomputes the
  flattened entity list when those change.
- **Counter-scale**: in Pixi layers, anything that should stay constant
  pixel-size when zoomed (handles, dot sizes, label backgrounds) is
  divided by `viewport.zoom` (`px(n)` helper).
- **Notes are HTML, not Pixi**: rendered via `NotesOverlay.tsx` so URLs
  are clickable and text editing uses native form elements. Position
  comes from `world → screen`.
- **Touch / mobile**: pinch-zoom is wired in Canvas. The Layers panel
  becomes a slide-over; the Inspector becomes a slide-over from the
  right. Bottom toolbar floats above the safe-area inset on iOS.
- **Fonts**: import via `next/font` so CSS variables are stable across
  SSR. Don't add `<link href="https://fonts.gstatic.com">` tags.
- **Tooling commands**:
  - `bun run dev` — Next dev server.
  - `bun run typecheck` — `tsc --noEmit`. Run before committing.
  - `bun run build` — production build.
  - `bun run migrate` — apply Supabase migrations (needs
    `SUPABASE_DB_URL`).

## Analytics

- Events go through `lib/analytics/index.ts`. Use `track(EVENTS.x,
  props?)` rather than free-form strings.
- Both providers (GA + Mixpanel) are optional. Without env vars,
  `init()` is a no-op and `track()` quietly drops events.
- `<AnalyticsProvider />` is mounted in the root layout and emits a
  `page_view` on every client-side navigation.
- Don't track PII. Email and full names should not be sent — use
  `user.id` (the Supabase auth UUID) as the analytics identifier.

## When making changes

- Read the file before editing — Read before Edit is required.
- Follow the existing optimistic pattern when adding annotations.
- Don't add a parallel state container; extend Zustand.
- Don't introduce new icon libraries — extend `components/ui/Icon.tsx`.
- For UI work, prefer editing existing panels over adding new chrome.
- Keep CommonMark-readable comments only where the WHY isn't
  derivable from the code.
- Run `bun run typecheck` before declaring a task done.

## Known deferred work

- DWG parser fall-back when libredwg-web fails on 2019+ files (we tell
  the user to export DXF/PDF instead).
- DXF SPLINE / ELLIPSE / INSERT / HATCH support.
- Multi-page PDF — only page 1 is rendered.
- CRDT for fine-grained text editing (notes are last-write-wins
  today).
- Drawings can be transformed via Inspector NumFields but not yet
  click-and-drag on the canvas. Placed items, shapes and notes
  already support full canvas manipulation.
- Per-item z-order reordering across the unified Layers panel (only
  drawings have `sortOrder`; items/shapes use `z_order` controls in
  the Inspector).
