import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, createPhotographer, fetchPhotographers, updatePhotographer, deletePhotographer } from "@/lib/admin-data";
import { checkBodySize, checkCsrf } from "@/lib/api-guard";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const isAdmin = await requireAdmin(user.id);
  if (!isAdmin) return null;
  return user;
}

// GET /api/admin/photographers — list all photographers
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photographers = await fetchPhotographers();
  return NextResponse.json(photographers);
}

// POST /api/admin/photographers — create a photographer
export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;
  const sizeError = checkBodySize(req, 16 * 1024);
  if (sizeError) return sizeError;

  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { full_name, email, password, phone, bio, plan } = body;

  if (!full_name || !email || !password) {
    return NextResponse.json({ error: "full_name, email, and password are required" }, { status: 400 });
  }

  const result = await createPhotographer({ full_name, email, password, phone, bio, plan });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ success: true });
}

// PATCH /api/admin/photographers — update a photographer
export async function PATCH(req: NextRequest) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;
  const sizeError = checkBodySize(req, 16 * 1024);
  if (sizeError) return sizeError;

  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...payload } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const result = await updatePhotographer(id, payload);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/photographers?id=xxx — delete a photographer
export async function DELETE(req: NextRequest) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const result = await deletePhotographer(id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ success: true });
}
