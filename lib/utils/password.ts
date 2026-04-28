import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

const SECRET = () => process.env.SHARE_COOKIE_SECRET || "dev-share-cookie-secret-change-me";

export function signShareToken(slug: string) {
  const ts = Date.now().toString();
  const payload = `${slug}.${ts}`;
  const sig = crypto.createHmac("sha256", SECRET()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyShareToken(slug: string, token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tslug, ts, sig] = parts;
  if (tslug !== slug) return false;
  const expected = crypto
    .createHmac("sha256", SECRET())
    .update(`${tslug}.${ts}`)
    .digest("hex");
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  // 30 day max
  const age = Date.now() - parseInt(ts, 10);
  if (age > 30 * 24 * 3600 * 1000) return false;
  return true;
}
