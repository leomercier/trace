import { Resend } from "resend";

let _resend: Resend | null = null;
function client() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) return null;
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.RESEND_FROM || "Trace <onboarding@resend.dev>";

export async function sendInviteEmail(args: {
  to: string;
  inviter: string;
  orgName: string;
  acceptUrl: string;
  role: string;
}) {
  const c = client();
  if (!c) {
    console.log("[email] (no RESEND_API_KEY) Would send invite to", args.to, args.acceptUrl);
    return { ok: true, mocked: true as const };
  }
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1c1917">
      <h1 style="font-family: Georgia, serif; font-size: 28px; margin: 0 0 16px">You're invited to ${escape(args.orgName)} on Trace</h1>
      <p style="line-height: 1.5; color: #57534e">${escape(args.inviter)} invited you to join <strong>${escape(args.orgName)}</strong> as <strong>${escape(args.role)}</strong>.</p>
      <p style="margin: 24px 0">
        <a href="${args.acceptUrl}" style="display: inline-block; background: #1c1917; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none">Accept invite</a>
      </p>
      <p style="font-size: 12px; color: #a8a29e">If you weren't expecting this email, you can ignore it. The link expires in 7 days.</p>
    </div>
  `;
  const res = await c.emails.send({
    from: FROM,
    to: args.to,
    subject: `Join ${args.orgName} on Trace`,
    html,
  });
  return { ok: !res.error, error: res.error?.message };
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
