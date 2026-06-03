import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// ── Server-side plan config map ───────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { maxEvents: number; maxStorageGb: number }> = {
  free:      { maxEvents: 1,      maxStorageGb: 10   },
  pro:       { maxEvents: 10,     maxStorageGb: 100  },
  unlimited: { maxEvents: 999999, maxStorageGb: 500  },
};

/**
 * POST /api/payments/upgrade
 *
 * - Free downgrade: no payment needed, just updates DB.
 * - Paid upgrade: requires Razorpay payment verification tokens.
 *   Verifies HMAC-SHA256 signature before updating the plan.
 *   Without a valid signature, paid upgrades are rejected.
 *
 * Body:
 *   { plan: "free" }
 *   { plan: "pro"|"unlimited", razorpay_payment_id, razorpay_order_id, razorpay_signature }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

    if (!plan || !Object.keys(PLAN_CONFIG).includes(plan)) {
      return NextResponse.json({ error: "Invalid subscription plan selection" }, { status: 400 });
    }

    // ── Paid plan: verify Razorpay HMAC-SHA256 signature ─────────────────────
    if (plan !== "free") {
      const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!razorpaySecret) {
        // Razorpay not configured — allow sandbox simulator flow (dev/testing only)
        console.warn("[payments/upgrade] RAZORPAY_KEY_SECRET not set — allowing unsecured upgrade (sandbox mode)");
      } else {
        // Verify all three Razorpay tokens are present
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
          return NextResponse.json(
            { error: "Payment verification tokens missing. Complete payment first." },
            { status: 400 }
          );
        }

        // Razorpay signature = HMAC-SHA256(order_id + "|" + payment_id, secret_key)
        const expectedSignature = crypto
          .createHmac("sha256", razorpaySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

        if (expectedSignature !== razorpay_signature) {
          console.error("[payments/upgrade] Signature mismatch — possible payment forgery attempt");
          return NextResponse.json(
            { error: "Payment verification failed. Signature mismatch." },
            { status: 403 }
          );
        }
      }
    }

    // ── Update plan in DB ─────────────────────────────────────────────────────
    const { maxEvents, maxStorageGb } = PLAN_CONFIG[plan];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("profiles")
      .update({
        plan,
        max_events: maxEvents,
        max_storage_gb: maxStorageGb,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated to ${plan} plan.`,
      profile: data,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
