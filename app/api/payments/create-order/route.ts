import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";

// ── Server-side price map (paise) — NEVER let the client supply amounts ──────
const PLAN_PRICES: Record<string, number> = {
  pro: 99900,        // ₹999/month
  unlimited: 249900, // ₹2,499/month
};

const PLAN_LABELS: Record<string, string> = {
  pro: "Personal Pro Plan — Monthly",
  unlimited: "Studio Plan — Monthly",
};

/**
 * POST /api/payments/create-order
 *
 * Creates a real Razorpay order server-side so the amount can never
 * be tampered with on the client.
 *
 * Body: { plan: "pro" | "unlimited" }
 * Response: { orderId, amount, currency, keyId }
 */
export async function POST(req: NextRequest) {
  try {
    // F-09: CSRF check
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    // F-14: Body size limit (only {plan} in body)
    const sizeError = checkBodySize(req, 4 * 1024);
    if (sizeError) return sizeError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    if (!plan || !["pro", "unlimited"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan selection" }, { status: 400 });
    }

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    // If Razorpay is not configured, return a flag so the client can fall
    // back to the sandbox payment simulator
    if (!razorpayKeyId || !razorpaySecret) {
      return NextResponse.json({ sandbox: true, plan }, { status: 200 });
    }

    const amount = PLAN_PRICES[plan];
    const receipt = `spotme_${user.id.slice(0, 8)}_${Date.now()}`;

    // Create a Razorpay order via their REST API
    const authHeader = Buffer.from(`${razorpayKeyId}:${razorpaySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt,
        notes: {
          user_id: user.id,
          plan,
          label: PLAN_LABELS[plan],
        },
      }),
    });

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text();
      console.error("[create-order] Razorpay API error:", errBody);
      return NextResponse.json({ error: "Failed to create payment order" }, { status: 502 });
    }

    const order = await rzpRes.json();

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayKeyId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-order] Unexpected error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
