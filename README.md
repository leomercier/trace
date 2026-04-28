# Trace

A free, browser-based collaborative canvas for measuring and annotating drawings.
Drop a DWG, DXF, PDF, SVG, PNG or JPG, calibrate the scale, and place
measurements that snap to entity endpoints. Invite teammates as editors or
viewers — see each other's cursors live. Share a password-protected link with
anyone, no account required.

Built with Next.js 14 (App Router), TypeScript, Tailwind, Supabase (auth, DB,
storage, realtime), PixiJS v8, Zustand, Resend.

---

## Quick start

```bash
bun install
cp .env.example .env.local   # fill in the values, see "Environment" below
bun dev
```

Open http://localhost:3000.

To produce a production build: `bun run build`.
To type-check only: `bun run typecheck`.

---

## Environment

All variables and what they do:

| Variable | Where used | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | yes | From Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | yes | Anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | yes | Service role key — never expose to browser. Used by `/api/share/*` and invite acceptance to bypass RLS for verified callers. |
| `NEXT_PUBLIC_APP_URL` | client + server | yes | The full origin, e.g. `https://trace.app`. Used in invite & share emails. |
| `RESEND_API_KEY` | server | optional | If absent, invite emails are logged to the server console instead of sent. The accept-link is still copyable from the UI. |
| `RESEND_FROM` | server | optional | Defaults to `Trace <onboarding@resend.dev>`. Set to your verified sender once your Resend domain is set up. |
| `SHARE_COOKIE_SECRET` | server | yes | Long random string. Used to HMAC the public-share auth cookie. Rotate to invalidate all guest sessions. |

`.env.example` is checked in.

---

## Deployment

### Supabase project setup

1. Create a Supabase project.
2. Run the migrations in order (Supabase Studio → SQL Editor, or via the
   Supabase CLI):
   - `supabase/migrations/0001_init.sql` — schema
   - `supabase/migrations/0002_rls.sql` — Row Level Security
   - `supabase/migrations/0003_storage.sql` — storage buckets + policies
3. **Enable Realtime** for these tables (Database → Replication):
   - `measurements`
   - `notes`
   - `pages`
4. **Authentication providers:**
   - Email magic-link is enabled by default.
   - Google: Authentication → Providers → Google. Add the OAuth client ID/secret
     from Google Cloud Console. The redirect URI is
     `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
5. **Site URL & redirect URLs** (Authentication → URL Configuration):
   - Site URL: `https://your-domain.com` (or `http://localhost:3000` in dev)
   - Additional redirect URLs: `https://your-domain.com/auth/callback`,
     `http://localhost:3000/auth/callback`

### Vercel

1. Import the repo into Vercel.
2. Add all the environment variables from `.env.example` to the Vercel project.
   `SUPABASE_SERVICE_ROLE_KEY` and `SHARE_COOKIE_SECRET` should be marked
   sensitive.
3. Deploy. The default `next build` works.
4. Once deployed, update `NEXT_PUBLIC_APP_URL` to the production URL and the
   Supabase redirect URLs to include the production `/auth/callback`.

### Resend (optional)

1. Create a Resend account, verify your sending domain.
2. Drop the API key into `RESEND_API_KEY` and set `RESEND_FROM`
   (e.g. `Trace <invites@yourdomain.com>`).
3. Without Resend the app still works — invites generate copyable links and the
   email step is logged to the console.

---

## Architecture map

```
app/
  (marketing)/page.tsx          marketing landing
  (auth)/login,signup           magic-link + Google OAuth
  auth/callback/route.ts        OAuth + OTP code exchange
  post-login/                   creates pending org after signup
  app/                          app routes (auth-gated by middleware)
  app/[orgSlug]/                org-scoped layout + projects list
  app/[orgSlug]/settings/       members + invites
  app/[orgSlug]/[projectId]/    pages list
  app/[orgSlug]/[projectId]/[pageId]/  THE EDITOR
  p/[slug]/                     public viewer (password gate + viewer)
  api/
    orgs/create                 create org and add owner
    invites                     create / list invites + Resend email
    invite/[token]              accept-invite redirect handler
    members/[orgId]/[userId]    PATCH role / DELETE member
    shares                      list/create public_shares
    shares/[id]                 revoke share
    share/[slug]/auth           public password gate (sets HMAC cookie)
    share/[slug]/data           service-role data fetch for public viewer

components/
  canvas/
    Canvas.tsx                  Pixi mount + interactions (pan, zoom, snap)
    Editor.tsx                  Editor wrapper that wires data, store, realtime
    NotesOverlay.tsx            HTML sticky notes (positioned via worldToScreen)
    pixi/
      Viewport.ts               pan/zoom/fit math
      DrawingLayer.ts           renders parsed entities (lines, text, images)
      MeasurementLayer.ts       red lines, dots, labels (counter-scaled)
      CursorLayer.ts            remote-user cursors
      Snapping.ts               grid-hash spatial index for endpoint snapping
    parsers/
      index.ts                  dispatch by file type, dynamic-imported
      image.ts                  PNG/JPG/SVG → world image entity
      pdf.ts                    pdfjs-dist render page 1 → texture
      dxf.ts                    hand-rolled minimal DXF parser
      dwg.ts                    TODO(trace): wire @mlightcad/libredwg-web
  panels/
    Toolbar.tsx                 floating tool buttons
    Inspector.tsx               desktop right rail
    MobileSheet.tsx             collapsing bottom sheet on mobile
    CalibrateDialog.tsx         enter real length to set scale
    ShareDialog.tsx             create + revoke public links
    AttachmentsPanel.tsx        floating attachments drawer

stores/editorStore.ts           Zustand store (view, tool, data, presence)

lib/
  supabase/{client,server,types}  per-context clients
  realtime/page.ts              postgres_changes + broadcast + presence
  email/send.ts                 Resend wrapper (silent in dev)
  utils/{geometry,units,slug,password,date,cn,idb}
```

### State + sync

The editor mirrors all annotations into a Zustand store. Mutations are
**optimistic**: write locally first, then upsert to Supabase. Postgres-changes
events round-trip remote edits back into the same store, keyed by row UUID — so
simultaneous edits to *different* rows never conflict, and same-row edits
last-write-win. Cursors and in-progress draft lines go through Supabase
Broadcast at ~30Hz; presence shows avatars in the top bar.

### Permissions

Org roles: `owner | admin | editor | viewer`. RLS enforces them at the database
level (see `0002_rls.sql`). The UI hides editing affordances for viewers but
trusts RLS as the source of truth. Public shares bypass RLS only via the
`/api/share/[slug]/*` server routes, which check a signed cookie issued after a
correct password.

### Drawing pipeline

1. User drops a file → uploaded to Supabase Storage (`drawings` bucket).
2. Page row records the path + file type.
3. Editor fetches a signed URL, downloads the blob, hashes it, and looks the
   parsed result up in IndexedDB.
4. Cache miss → parse client-side (DWG → DXF → entities, PDF → image, etc.) and
   store the parsed entities in IndexedDB.
5. Pixi `DrawingLayer` renders the entities; `Snapping` builds a vertex
   spatial index so the measure tool can snap to endpoints.

### What's deferred (TODO(trace))

- DWG parsing: `@mlightcad/libredwg-web` integration. For v1 users export to
  DXF/PDF.
- DXF advanced entities: SPLINE, ELLIPSE, INSERT/blocks expansion, HATCH.
- Multi-page PDFs: only page 1 is rendered today.
- Yjs / CRDT for fine-grained conflict resolution.
- Free-tier quotas (`usage_limits` stub table).
- Thumbnails are not auto-generated yet (the `thumbnails` bucket exists).

---

## Development notes

- `bun run typecheck` — strict TypeScript.
- `bun run dev` — Next dev server.
- `bun run build` — production build (no static export, all `force-dynamic`).
- Tailwind tokens live in `styles/tokens.css` — change the palette there. Don't
  add gradients or glassmorphism; the design language is restrained.
- Pixi v8 — note `pixiLine` / counter-scale tricks in `MeasurementLayer.ts` to
  keep dots and labels constant pixel size as the user zooms.
- Supabase types: hand-rolled in `lib/supabase/types.ts`. Replace with
  `bunx supabase gen types typescript` output once you have a project ID.

---

## License

Private (for now). Trace is currently free for everyone.
