// ============================================================
// lib/auth-errors.ts — User-friendly auth error messages
// Maps raw Supabase error messages to safe, human-readable text.
// NEVER expose raw Supabase/internal error strings to users.
// ============================================================

/**
 * Known Supabase auth error patterns mapped to user-friendly messages.
 * Order matters — first match wins.
 */
const AUTH_ERROR_MAP: { pattern: RegExp; message: string }[] = [
  // Login errors
  {
    pattern: /invalid login credentials|invalid.*credentials/i,
    message: "Incorrect email or password. Please check your credentials and try again.",
  },
  {
    pattern: /email.*not.*confirmed|email_not_confirmed/i,
    message: "Your email address hasn't been verified yet. Please check your inbox for the verification email.",
  },
  {
    pattern: /invalid.*email/i,
    message: "Please enter a valid email address.",
  },

  // Sign-up errors
  {
    pattern: /user.*already.*registered|already.*exists|duplicate/i,
    message: "An account with this email already exists. Try signing in instead.",
  },
  {
    pattern: /password.*should.*be.*at.*least|password.*too.*short|password.*characters/i,
    message: "Your password is too short. Please use at least 6 characters.",
  },
  {
    pattern: /weak.*password/i,
    message: "Please choose a stronger password with at least 6 characters.",
  },
  {
    pattern: /signup.*disabled/i,
    message: "New account registration is currently unavailable. Please try again later.",
  },

  // Rate limiting
  {
    pattern: /rate.*limit|too.*many.*requests|over.*request.*limit/i,
    message: "Too many attempts. Please wait a moment and try again.",
  },
  {
    pattern: /email.*rate.*limit/i,
    message: "We've sent too many emails recently. Please wait a few minutes before trying again.",
  },

  // Session / token errors
  {
    pattern: /session.*expired|token.*expired|refresh.*token/i,
    message: "Your session has expired. Please sign in again.",
  },
  {
    pattern: /auth.*session.*missing/i,
    message: "Your session could not be found. Please sign in again.",
  },

  // Password reset errors
  {
    pattern: /same.*password|cannot.*reuse/i,
    message: "Your new password must be different from your current password.",
  },
  {
    pattern: /recovery.*link.*expired|otp.*expired|expired/i,
    message: "This link has expired. Please request a new one.",
  },

  // Network errors
  {
    pattern: /network|fetch.*failed|failed.*to.*fetch|ECONNREFUSED/i,
    message: "Unable to connect. Please check your internet connection and try again.",
  },
];

/**
 * Converts a raw Supabase auth error message into a user-friendly message.
 * Falls back to a safe generic message if no pattern matches.
 */
export function getAuthErrorMessage(
  rawMessage: string | undefined | null,
  fallback?: string
): string {
  const defaultFallback = "Something went wrong. Please try again.";

  if (!rawMessage) return fallback ?? defaultFallback;

  for (const { pattern, message } of AUTH_ERROR_MAP) {
    if (pattern.test(rawMessage)) {
      return message;
    }
  }

  // If we don't recognize the error, return a generic safe message.
  // Log the unknown error server-side for debugging.
  console.error("[auth-errors] Unhandled auth error:", rawMessage);
  return fallback ?? defaultFallback;
}

/**
 * Converts a URL error parameter (from OAuth/callback redirects) into
 * a user-friendly message.
 */
export function getUrlAuthErrorMessage(
  errorCode: string | null,
  errorDescription: string | null
): string | null {
  if (!errorCode) return null;

  switch (errorCode) {
    case "auth_callback_failed":
      return "Authentication failed. Please try signing in again.";
    case "access_denied":
      return "Access was denied. Please try again or contact support.";
    case "server_error":
      return "Our authentication service encountered an issue. Please try again later.";
    default:
      // Try to match the description through the standard mapper
      if (errorDescription) {
        return getAuthErrorMessage(errorDescription);
      }
      return "An authentication error occurred. Please try signing in again.";
  }
}
