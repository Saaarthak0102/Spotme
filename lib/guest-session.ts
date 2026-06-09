import { cookies } from "next/headers";
import crypto from "crypto";

const DEV_SECRET = "spotme_guest_session_secret_default_32chars_spotme";

function getGuestSessionSecret(): string {
  const secret = process.env.GUEST_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️ [guest-session] GUEST_SESSION_SECRET is not configured in production. " +
      "Falling back to default secret (not secure for production). Please set GUEST_SESSION_SECRET in your production env variables."
    );
  }
  return DEV_SECRET;
}

// 2 days session duration in milliseconds
const SESSION_DURATION = 2 * 24 * 60 * 60 * 1000;

interface CookiePayload {
  access: Record<string, number>; // eventId -> expiresAt
  guests?: Record<string, string>; // eventId -> verified guestId
}

export function signEventToken(payload: CookiePayload): string {
  const payloadStr = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadStr).toString("base64");
  const signature = crypto
    .createHmac("sha256", getGuestSessionSecret())
    .update(payloadBase64)
    .digest("hex");
  return `${payloadBase64}.${signature}`;
}

export function verifyEventToken(token: string): CookiePayload | null {
  try {
    const [payloadBase64, signature] = token.split(".");
    if (!payloadBase64 || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", getGuestSessionSecret())
      .update(payloadBase64)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

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

export async function getEventSessionGuestId(eventId: string): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get("spotme_guest_session")?.value;
    if (!cookieValue) return null;

    const payload = verifyEventToken(cookieValue);
    if (!payload) return null;

    const expiresAt = payload.access[eventId];
    if (!expiresAt || Date.now() > expiresAt) return null;

    return payload.guests?.[eventId] ?? null;
  } catch (err) {
    console.error("getEventSessionGuestId cookie error:", err);
    return null;
  }
}

export async function hasGuestSessionFor(eventId: string, guestId: string): Promise<boolean> {
  const sessionGuestId = await getEventSessionGuestId(eventId);
  return sessionGuestId === guestId;
}

export { SESSION_DURATION };
