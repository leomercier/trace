import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewOrgForm } from "./NewOrgForm";
import { AuthShell } from "@/components/marketing/AuthShell";

export const dynamic = "force-dynamic";

export default async function NewOrgPage() {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  return (
    <AuthShell
      index="03"
      label="New workspace"
      title={
        <>
          Name your
          <br />
          workspace.
        </>
      }
      intro="A workspace holds projects and members. You can have more than one."
      footer={<>Step 01 / 02 · You can rename this later</>}
    >
      <NewOrgForm />
    </AuthShell>
  );
}
