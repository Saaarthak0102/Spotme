// ============================================================
// lib/auth-validate.ts — Client-side auth input validation & sanitization
//
// All auth pages (register, login, forgot-password, update-password)
// use these helpers before calling Supabase to prevent:
//   • XSS via injected HTML/script tags in name fields
//   • SQL-injection-like probes in email/name fields
//   • Overly long inputs that could abuse downstream systems
// ============================================================

// ---------------------------------------------------------------------------
// Sanitize
// ---------------------------------------------------------------------------

/** Strip leading/trailing whitespace and collapse repeated internal spaces */
export function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Validators — each returns null on success, a user-friendly string on failure
// ---------------------------------------------------------------------------

/** RFC-5322-lite email check */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email address is required.";
  if (trimmed.length > 320)
    return "Email address is too long (max 320 characters).";
  // Reasonable regex — browser `type="email"` already catches most cases;
  // this is a defence-in-depth layer before the Supabase call.
  const emailRe = /^[^\s@<>'"]+@[^\s@<>'"]+\.[^\s@<>'"]{2,}$/;
  if (!emailRe.test(trimmed)) return "Please enter a valid email address.";
  return null;
}

/**
 * Password policy:
 *  - Min 8 characters (industry standard; Supabase enforces 6 minimum server-side)
 *  - Max 128 characters
 *  - Must contain at least one non-space character
 */
export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8)
    return "Password must be at least 8 characters long.";
  if (password.length > 128)
    return "Password is too long (max 128 characters).";
  if (/^\s+$/.test(password))
    return "Password cannot consist only of spaces.";
  return null;
}

/**
 * Full name validation:
 *  - Required
 *  - Max 200 characters
 *  - No HTML tags or control characters
 */
export function validateFullName(name: string): string | null {
  const trimmed = sanitizeText(name);
  if (!trimmed) return "Full name is required.";
  if (trimmed.length > 200)
    return "Name is too long (max 200 characters).";
  // Reject HTML tags and control characters
  if (/<[^>]*>/.test(trimmed))
    return "Name must not contain HTML tags.";
  // Reject ASCII control chars (0x00–0x1F, 0x7F) except standard whitespace
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmed))
    return "Name contains invalid characters.";
  return null;
}

/**
 * Generic dangerous-input check for any free-text field.
 * Rejects strings that look like XSS payloads or SQL injection probes.
 * Returns true if the input is potentially dangerous.
 */
export function containsDangerousInput(value: string): boolean {
  const lower = value.toLowerCase();
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,        // onclick=, onerror=, etc.
    /--\s/,              // SQL line comment
    /\/\*[\s\S]*?\*\//,       // SQL block comment
    /;\s*(drop|delete|truncate|insert|update|select|union)\s/i,
    /\bunion\s+(all\s+)?select\b/i,
    /\bexec\s*\(/i,
    /\beval\s*\(/i,
  ];
  return patterns.some((re) => re.test(lower));
}

// ---------------------------------------------------------------------------
// Composite helpers used by pages
// ---------------------------------------------------------------------------

export interface RegisterValidation {
  fullName?: string;
  email?: string;
  password?: string;
}

export function validateRegisterForm(
  fullName: string,
  email: string,
  password: string
): RegisterValidation | null {
  const errors: RegisterValidation = {};

  const nameErr = validateFullName(fullName);
  if (nameErr) errors.fullName = nameErr;
  else if (containsDangerousInput(fullName))
    errors.fullName = "Name contains invalid characters.";

  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  else if (containsDangerousInput(email))
    errors.email = "Email contains invalid characters.";

  const passErr = validatePassword(password);
  if (passErr) errors.password = passErr;

  return Object.keys(errors).length > 0 ? errors : null;
}

export function validateLoginForm(
  email: string,
  password: string
): { email?: string; password?: string } | null {
  const errors: { email?: string; password?: string } = {};

  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  else if (containsDangerousInput(email))
    errors.email = "Email contains invalid characters.";

  if (!password) errors.password = "Password is required.";
  else if (password.length > 128)
    errors.password = "Password is too long (max 128 characters).";

  return Object.keys(errors).length > 0 ? errors : null;
}
