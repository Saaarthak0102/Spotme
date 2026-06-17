import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-data";
import { AdminKPIsWrapper } from "@/components/admin/admin-panels";

export const dynamic = "force-dynamic";

export default async function KPIsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) redirect("/dashboard");

  return <AdminKPIsWrapper />;
}
