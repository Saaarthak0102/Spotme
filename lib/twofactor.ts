// ============================================================
// twofactor.ts — 2Factor.in OTP API integration
// Server-side helper to send and verify guest mobile OTP codes
// ============================================================

const API_KEY = process.env.FACTOR_API_KEY?.trim();

/**
 * Normalise phone numbers to E.164-like format (e.g. +919876543210 or 919876543210)
 * 2Factor.in expects country code prefix (e.g. 91 for India) without leading + or with it,
 * depending on their parsing. Usually sending with + is fine, or we strip any non-digit.
 */
function cleanPhoneNumber(phone: string): string {
  return phone.trim().replace(/[^\d+]/g, "");
}

interface SendOtpResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  method: "2factor" | "mock";
}

interface VerifyOtpResult {
  success: boolean;
  error?: string;
  method: "2factor" | "mock";
}

/**
 * Send an OTP code via 2Factor.in AUTOGEN API (or mock in development)
 */
export async function sendOtpCode(phone: string): Promise<SendOtpResult> {
  const cleanPhone = cleanPhoneNumber(phone);

  if (!API_KEY || API_KEY === "" || API_KEY.startsWith("your_") || API_KEY.includes("FACTOR_API_KEY")) {
    // Mock Mode
    console.log(`\n========================================\n[2FACTOR MOCK] Sent OTP code "123456" to ${cleanPhone}\n========================================\n`);
    return {
      success: true,
      sessionId: "mock-session-id",
      method: "mock",
    };
  }

  try {
    // 2Factor AUTOGEN endpoint: GET https://2factor.in/API/V1/{api_key}/SMS/{phone_number}/AUTOGEN
    // We append ?OTPLen=6 to request a 6-digit OTP code.
    const url = `https://2factor.in/API/V1/${API_KEY}/SMS/${encodeURIComponent(cleanPhone)}/AUTOGEN?OTPLen=6`;
    
    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`2Factor API returned status ${res.status}`);
    }

    const data = await res.json();

    if (data.Status === "Success") {
      return {
        success: true,
        sessionId: data.Details, // Session ID hash
        method: "2factor",
      };
    } else {
      console.error("[twofactor] Send API failure response:", data);
      return {
        success: false,
        error: data.Details || "Failed to send OTP code",
        method: "2factor",
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[twofactor] Exception sending OTP:", msg);
    return {
      success: false,
      error: `Network error sending OTP: ${msg}`,
      method: "2factor",
    };
  }
}

/**
 * Verify an OTP code via 2Factor.in SMS/VERIFY API (or mock in development)
 */
export async function verifyOtpCode(sessionId: string, code: string): Promise<VerifyOtpResult> {
  if (sessionId === "mock-session-id") {
    if (code === "123456") {
      return { success: true, method: "mock" };
    }
    return {
      success: false,
      error: "Invalid verification code. Use 123456 for testing.",
      method: "mock",
    };
  }

  if (!API_KEY) {
    return {
      success: false,
      error: "2Factor API key is not configured.",
      method: "mock",
    };
  }

  try {
    // 2Factor VERIFY endpoint: GET https://2factor.in/API/V1/{api_key}/SMS/VERIFY/{session_id}/{otp_input}
    const url = `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${encodeURIComponent(sessionId)}/${encodeURIComponent(code)}`;
    
    const res = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`2Factor API returned status ${res.status}`);
    }

    const data = await res.json();

    if (data.Status === "Success") {
      return { success: true, method: "2factor" };
    } else {
      console.warn("[twofactor] Verify API failure response:", data);
      return {
        success: false,
        error: data.Details || "Invalid verification code",
        method: "2factor",
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[twofactor] Exception verifying OTP:", msg);
    return {
      success: false,
      error: `Network error verifying OTP: ${msg}`,
      method: "2factor",
    };
  }
}
