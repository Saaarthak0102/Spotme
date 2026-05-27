import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body;

    if (!plan || !["free", "pro", "unlimited"].includes(plan)) {
      return NextResponse.json({ error: "Invalid subscription plan selection" }, { status: 400 });
    }

    // Assign pricing tier configurations
    let maxEvents = 1;
    let maxStorageGb = 10;

    if (plan === "pro") {
      maxEvents = 5;
      maxStorageGb = 100;
    } else if (plan === "unlimited") {
      maxEvents = 999999;
      maxStorageGb = 1000;
    }

    // Update profiles table in Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("profiles")
      .update({
        plan,
        max_events: maxEvents,
        max_storage_gb: maxStorageGb,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan} plan.`,
      profile: data
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
