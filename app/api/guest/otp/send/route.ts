import { NextRequest, NextResponse } from "next/server";
import { checkCsrf, checkBodySize } from "@/lib/api-guard";
import { sendOtpCode } from "@/lib/twofactor";

// E.164-ish pattern for basic validation (matches E.164 pattern in register endpoint)
const E164_RE = /^\+[1-9]\d{7,14}$/;

export async function POST(req: NextRequest) {
  // CSRF Check
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // Body size limit (1 KB is plenty for a phone number payload)
  const sizeError = checkBodySize(req, 1024);
  if (sizeError) return sizeError;

  try {
    const { phone: rawPhone } = await req.json();

    if (!rawPhone) {
      return NextResponse.json({ error: "Missing phone number" }, { status: 400 });
    }

    const phone = String(rawPhone).trim().replace(/[\s\-().]/g, "");
    if (!E164_RE.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use international format (e.g. +919876543210)" },
        { status: 400 }
      );
    }

    const result = await sendOtpCode(phone);

    if (result.success) {
      return NextResponse.json({
        success: true,
        sessionId: result.sessionId,
        method: result.method,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send verification code" },
        { status: 500 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[guest/otp/send] Error:", msg);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
