import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  // If Supabase env vars are missing (e.g. before someone sets them on
  // Vercel), don't crash the request — just pass through. The page-level
  // server components will render their own auth-required UI.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    res.headers.set("x-trace-warning", "missing-supabase-env");
    return res;
  }

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(toSet: { name: string; value: string; options?: any }[]) {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    });
    await supabase.auth.getUser();
  } catch (err) {
    // Never let middleware bring down the whole app.
    console.error("[trace middleware]", err);
  }
  return res;
}

export const config = {
  matcher: [
    // Skip Next internals, static files, and API routes (they handle their
    // own auth and don't need session refresh).
    "/((?!_next/static|_next/image|_next/data|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm|ico|map)$).*)",
  ],
};
