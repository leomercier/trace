import { redirect } from "next/navigation";
import { PostLoginClient } from "./PostLoginClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PostLogin({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return <PostLoginClient next={searchParams.next || "/app"} />;
}
