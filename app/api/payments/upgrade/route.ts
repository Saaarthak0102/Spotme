import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { type NextRequest } from "next/server";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";

// ── Server-side plan config map ───────────────────────────────────────────────
// Keep in sync with lib/admin-data.ts PLAN_ENTITLEMENTS
const PLAN_CONFIG: Record<string, { maxEvents: number; maxStorageGb: number }> = {
  free:         { maxEvents: 1,      maxStorageGb: 5    },
  starter:      { maxEvents: 1,      maxStorageGb: 20   },
  pro:          { maxEvents: 4,      maxStorageGb: 60   },
  studio_basic: { maxEvents: 5,      maxStorageGb: 40   },
  studio_pro:   { maxEvents: 999999, maxStorageGb: 100  },
  custom:       { maxEvents: 999999, maxStorageGb: 1000 },
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
export async function POST(request: NextRequest) {
  try {
    // F-09: CSRF check
    const csrfError = checkCsrf(request);
    if (csrfError) return csrfError;

    // F-14: Body size limit
    const sizeError = checkBodySize(request, 8 * 1024);
    if (sizeError) return sizeError;

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
        // L-3: Razorpay not configured — sandbox mode allows unsecured upgrades.
        // ⚠️  THIS MUST NEVER REACH PRODUCTION — set RAZORPAY_KEY_SECRET in your env.
        if (process.env.NODE_ENV === "production") {
          console.error(
            "[payments/upgrade] ⛔ RAZORPAY_KEY_SECRET is missing in a PRODUCTION environment. " +
            "Paid plan upgrade is being rejected to prevent unsecured access."
          );
          return NextResponse.json(
            { error: "Payment system not configured. Please contact support." },
            { status: 503 }
          );
        }
        console.warn(
          "[payments/upgrade] RAZORPAY_KEY_SECRET not set — allowing unsecured upgrade (SANDBOX/DEV only)"
        );
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

        // ── F-16 Fix: Use timing-safe comparison to prevent timing oracle attacks ──
        // JavaScript's !== leaks information about the HMAC byte-by-byte via
        // response time differences. timingSafeEqual is constant-time.
        const expectedBuf = Buffer.from(expectedSignature, "hex");
        const receivedBuf = Buffer.from(razorpay_signature, "hex");

        const signaturesMatch =
          expectedBuf.length === receivedBuf.length &&
          crypto.timingSafeEqual(expectedBuf, receivedBuf);

        if (!signaturesMatch) {
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
