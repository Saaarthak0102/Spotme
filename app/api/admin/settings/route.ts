import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, fetchGlobalSettings, updateGlobalSettings } from "@/lib/admin-data";
import { checkBodySize, checkCsrf } from "@/lib/api-guard";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) return null;
  return user;
}

// GET /api/admin/settings — get global settings
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const disabledFeatures = await fetchGlobalSettings();
  return NextResponse.json({ disabled_features: disabledFeatures });
}

// POST /api/admin/settings — update global settings
export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;
  const sizeError = checkBodySize(req, 8 * 1024);
  if (sizeError) return sizeError;

  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { disabled_features } = body;

    if (!Array.isArray(disabled_features)) {
      return NextResponse.json({ error: "disabled_features must be an array" }, { status: 400 });
    }

    const result = await updateGlobalSettings(disabled_features);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
