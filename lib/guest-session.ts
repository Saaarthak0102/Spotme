import { cookies } from "next/headers";
import crypto from "crypto";

const SECRET = process.env.GUEST_SESSION_SECRET || "spotme_guest_session_secret_default_32chars_spotme";

// 7 days session duration in milliseconds
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

interface CookiePayload {
  access: Record<string, number>; // eventId -> expiresAt
}

export function signEventToken(payload: CookiePayload): string {
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString("base64");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadBase64)
    .digest("hex");
  return `${payloadBase64}.${signature}`;
}

export function verifyEventToken(token: string): CookiePayload | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(payloadBase64)
      .digest("hex");

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8")) as CookiePayload;
    if (!payload.access) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function hasEventSession(eventId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get("spotme_guest_session")?.value;
    if (!cookieValue) return false;

    const payload = verifyEventToken(cookieValue);
    if (!payload) return false;

    const expiresAt = payload.access[eventId];
    if (!expiresAt) return false;

    if (Date.now() > expiresAt) return false; // Expired

    return true;
  } catch (err) {
    console.error("hasEventSession cookie error:", err);
    return false;
  }
}
export { SESSION_DURATION };
