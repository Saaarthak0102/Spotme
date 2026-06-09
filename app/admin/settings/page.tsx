import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";
import { AdminSettings } from "@/components/admin/admin-panels";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) redirect("/dashboard");

  return <AdminSettings />;
}
