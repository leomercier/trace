const ALPHA = "abcdefghijkmnpqrstuvwxyz23456789"; // no o/0/1/l for readability

export function randomSlug(len = 10) {
  let s = "";
  const buf = new Uint8Array(len);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < len; i++) s += ALPHA[buf[i] % ALPHA.length];
  return s;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function uniqueOrgSlug(name: string) {
  const base = slugify(name) || "org";
  return `${base}-${randomSlug(4)}`;
}
