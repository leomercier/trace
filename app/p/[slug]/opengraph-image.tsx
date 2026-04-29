import { ImageResponse } from "next/og";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Open Graph share card for /p/{slug}. Generated dynamically per-share so
 * the link in Slack/iMessage/etc shows the project and page name. Rendered
 * in tracable's brand palette via @vercel/og under the hood — no Pixi or
 * client JS, just SVG/HTML primitives that Next can rasterise on the edge.
 */
export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "tracable — shared workspace";

export default async function OpenGraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const svc = createServiceClient();
  const { data: share } = await svc
    .from("public_shares")
    .select("scope, project_id, page_id")
    .eq("slug", params.slug)
    .maybeSingle();

  let title = "tracable";
  let subtitle = "Shared workspace";
  if (share?.scope === "page" && share.page_id) {
    const { data: page } = await svc
      .from("pages")
      .select("name, projects:project_id (name)")
      .eq("id", share.page_id)
      .maybeSingle();
    title = page?.name || title;
    subtitle = (page as any)?.projects?.name || subtitle;
  } else if (share?.scope === "project" && share.project_id) {
    const { data: project } = await svc
      .from("projects")
      .select("name, description")
      .eq("id", share.project_id)
      .maybeSingle();
    title = project?.name || title;
    subtitle = project?.description || "Shared project";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#F5F7FA",
          color: "#0B0D10",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 16,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(11, 13, 16, 0.5)",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              background: "#0B0D10",
              borderRadius: 999,
            }}
          />
          tracable · shared workspace
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 28,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "rgba(11, 13, 16, 0.55)",
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              fontSize: 96,
              lineHeight: 0.95,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              maxWidth: 1000,
              wordBreak: "break-word",
            }}
          >
            {title}.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 20,
            color: "rgba(11, 13, 16, 0.6)",
          }}
        >
          <span>Open source · Source-available</span>
          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 16 }}>
            /p/{params.slug}
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
