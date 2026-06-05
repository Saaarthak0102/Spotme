# Phase 1 — Complete Form Discovery & Audit Report

> **Status:** Read-only audit. **No code was modified during this phase.**
> **Date:** 2026-06-05
> **Repository:** Spotme (Next.js + Supabase + Razorpay)

This document is the complete inventory of every user-facing form, input, validation rule, and submission target in the codebase. It is intended to be the foundation for any subsequent validation refactor.

---

## Summary

```txt
Total Forms Found:           13
Total Inputs Found:          48
Total Textareas Found:       4
Total Selects Found:         5
Total File Inputs Found:     5
Total API Submission Endpoints: 13
Total Supabase-Client Submissions: 6
Total Server Actions:        0
```

---

## Validation Coverage At a Glance

| Bucket | Forms |
| --- | --- |
| **Well Validated** | Login, Register, Forgot Password, Update Password, Public Inquiry (server), Admin Create Photographer (presence), Verify Guest |
| **Partially Validated** | Create Event (modal), Change Password (dashboard modal), Public Contact, Admin Update Photographer |
| **Unvalidated / Risky** | Public Contact Form (mock submit), Verify guest `display_name` length only by `name.length < 2` |

---

## Forms Inventory

| # | Form | Path | Inputs (count) | Validation |
| - | ---- | ---- | -------------- | ---------- |
| 1 | Login | `app/(auth)/login/page.tsx` | 2 + 1 checkbox | Full (client + Supabase) |
| 2 | Register | `app/(auth)/register/page.tsx` | 3 | Full (client + Supabase) |
| 3 | Forgot Password | `app/(auth)/forgot-password/page.tsx` | 1 | Client + Supabase reset |
| 4 | Update Password | `app/(auth)/update-password/page.tsx` | 1 | Client + Supabase |
| 5 | Public Contact | `app/(landing)/contact/page.tsx` | 4 + 1 textarea | **None — fake submit** |
| 6 | Public Inquiry | `app/(landing)/inquire/page.tsx` | 5 + 1 select + 1 textarea | Partial client / full server |
| 7 | Create Event Modal | `components/dashboard/shell.tsx` (CreateEventModal) | 4 + 3 admin fields + 1 select + 1 file | **None** |
| 8 | Change Password Modal (Dashboard) | `app/dashboard/account/page.tsx` | 2 | **None** (manual checks) |
| 9 | Change Plan Modal | `app/dashboard/account/page.tsx` | 3 (plan buttons) | n/a (no text input) |
| 10 | Admin Create Photographer | `components/admin/admin-panels.tsx` (PhotographerModal) | 3 + 1 select + 1 textarea | **None on client; server: presence only** |
| 11 | Admin Update Photographer | `components/admin/admin-panels.tsx` (PhotographerModal) | 3 + 1 select + 1 textarea | **None** |
| 12 | Guest Verify (Join Event) | `app/event/[eventId]/verify/page.tsx` | 1 + 1 select + 1 phone | Manual length checks |
| 13 | Find Me (Selfie Upload) | `app/event/[eventId]/find-me/page.tsx` | 2 file inputs | Server validates extension |

> **Note:** `components/admin/admin-panels.tsx` hosts three modals (Photographer create + edit) and the AdminInquiries search; `app/dashboard/account/page.tsx` hosts the ChangePassword + ChangePlan modals and the read-only Profile view.

---

## Step 2 — Per-Form Categorization

### 1. Login Form

```txt
Form Name:        Login
File Path:        app/(auth)/login/page.tsx
Purpose:          Sign in existing photographers / admins
Who Uses It:      Public User
Fields:
  - email        type="email"   required  maxLength=320  autoComplete="email"
  - password     type="password" required  maxLength=128  autoComplete="current-password"
  - remember     type="checkbox" optional
Submission Target:  supabase.auth.signInWithPassword()  (no own API route)
Current Problems:   None — uses lib/auth-validate.ts validateLoginForm()
```

### 2. Register Form

```txt
Form Name:        Register
File Path:        app/(auth)/register/page.tsx
Purpose:          Create new photographer account
Who Uses It:      Public User
Fields:
  - fullName     type="text"   required  maxLength=200  autoComplete="name"
  - email        type="email"  required  maxLength=320
  - password     type="password" required  minLength=8 maxLength=128
Submission Target:  supabase.auth.signUp()  (no own API route)
Current Problems:   None — uses validateRegisterForm() + duplicate-email detection
```

### 3. Forgot Password Form

```txt
Form Name:        Forgot Password
File Path:        app/(auth)/forgot-password/page.tsx
Purpose:          Trigger password reset email
Who Uses It:      Public User
Fields:
  - email        type="email"  required  maxLength=320
Submission Target:  supabase.auth.resetPasswordForEmail()
Current Problems:   None — uses validateEmail()
```

### 4. Update Password Form

```txt
Form Name:        Update Password
File Path:        app/(auth)/update-password/page.tsx
Purpose:          Set new password after reset link
Who Uses It:      Public User (post-reset)
Fields:
  - password     type="password" required  minLength=8  maxLength=128
Submission Target:  supabase.auth.updateUser()
Current Problems:   None — uses validatePassword()
```

### 5. Public Contact Form (Marketing)

```txt
Form Name:        Public Contact
File Path:        app/(landing)/contact/page.tsx
Purpose:          "Send an inquiry" landing page
Who Uses It:      Public User
Fields:
  - name         type="text"   required
  - email        type="email"  required
  - date         type="text"  optional  (free text "MM / DD / YYYY")
  - location     type="text"  optional
  - story        <textarea>   optional  rows=5
Submission Target:  NONE — only a setTimeout() that sets `isSubmitted = true`
Current Problems:
  - No maxLength, no validation, no API submission
  - Date typed as "text" not "date"
  - Misleading UX — appears to submit but does nothing
```

### 6. Public Inquiry Form (Pre-Sales)

```txt
Form Name:        Public Event Inquiry
File Path:        app/(landing)/inquire/page.tsx
Purpose:          Capture lead for new event bookings
Who Uses It:      Public User
Fields:
  - name         type="text"   required
  - email        type="email"  required
  - phone        type="tel"    optional  (no inputMode/pattern)
  - date         type="text"   optional  (free text "MM / DD / YYYY")
  - location     type="text"   optional
  - eventType    <select>      default "wedding"
  - guestCount   button group  (under-50, 50-100, 100-250, 250-500, 500+)
  - story        <textarea>    optional
Submission Target:  POST /api/inquire  (Supabase insert via anon key)
Current Problems:
  - No client-side validation at all
  - Phone has no format/length check
  - Date is "text" not "date"
  - Story textarea has no maxLength
  - Error handling: uses `alert()` on failure
```

### 7. Create Event Modal

```txt
Form Name:        Create Event Workspace
File Path:        components/dashboard/shell.tsx (CreateEventModal)
Purpose:          Photographer creates a new event/workspace
Who Uses It:      Photographer
Fields:
  - cover image  type="file"   optional  accept=image/jpeg,image/png,image/webp,image/heic
  - name         type="text"   required
  - type         <select>      default "marriage"  (marriage/hackathon/meetup/corporate/other)
  - venue        type="text"   required
  - date         type="date"   required
  - adminName    type="text"   required
  - adminPhone   type="tel"    required
  - adminEmail   type="email"  required
Submission Target:  supabase.storage.upload() + supabase.from("events").insert()
                     (no API route; no validation layer)
Current Problems:
  - No client-side validation, no maxLength, no field-level error display
  - Phone has no format check
  - File has no client-side size check (10MB is only in helper text)
  - Inline error display is generic
```

### 8. Change Password Modal (Dashboard)

```txt
Form Name:        Change Password
File Path:        app/dashboard/account/page.tsx (ChangePasswordModal)
Purpose:          Logged-in photographer changes their password
Who Uses It:      Photographer
Fields:
  - newPassword      type="password" required  (no minLength/maxLength attribute)
  - confirmPassword  type="password" required
Submission Target:  supabase.auth.updateUser()  (no API route)
Current Problems:
  - Uses ad-hoc manual checks (length < 6) — does not use validatePassword()
  - Inconsistent min length: 6 chars here vs. 8 chars in the auth pages
  - No maxLength, no complexity rule
  - No usage of sanitization helpers
```

### 9. Change Plan Modal

```txt
Form Name:        Change / Upgrade Plan
File Path:        app/dashboard/account/page.tsx (ChangePlanModal)
Purpose:          Change subscription tier (Free/Pro/Studio)
Who Uses It:      Photographer
Fields:            3 plan buttons (no text input)
Submission Target:  POST /api/payments/upgrade  (free downgrade) +
                     POST /api/payments/create-order  (paid upgrade)
Current Problems:   None significant; buttons only — no input validation needed
```

### 10. Admin Create Photographer

```txt
Form Name:        Add Photographer
File Path:        components/admin/admin-panels.tsx (PhotographerModal, !initial)
Purpose:          Admin creates a new photographer account
Who Uses It:      Admin
Fields:
  - full_name  type="text"     required
  - email      type="email"    required  (only on create)
  - password   type="password" required  (only on create)
  - phone      type="text"     optional   ⚠️ should be type="tel"
  - plan       <select>        free / pro / unlimited
  - bio        <textarea>      optional  rows=2
Submission Target:  POST /api/admin/photographers
Current Problems:
  - No client-side validation
  - Phone input is type="text" — no format/length check
  - Password has no minLength/maxLength attribute (relies on placeholder text only)
  - Server validates presence only (`if (!full_name || !email || !password)`)
  - No sanitization of `full_name` or `bio`
```

### 11. Admin Update Photographer

```txt
Form Name:        Edit Photographer
File Path:        components/admin/admin-panels.tsx (PhotographerModal, !!initial)
Purpose:          Admin edits photographer profile
Who Uses It:      Admin
Fields:
  - full_name  type="text"     required
  - phone      type="text"     optional  ⚠️ should be type="tel"
  - plan       <select>
  - bio        <textarea>      optional
Submission Target:  PATCH /api/admin/photographers
Current Problems:
  - Same as #10 — no client validation, phone type wrong, no sanitization
```

### 12. Guest Verify (Join Event)

```txt
Form Name:        Verify / Join Event
File Path:        app/event/[eventId]/verify/page.tsx
Purpose:          Guest registers with name + phone to access an event
Who Uses It:      Guest
Fields:
  - name         type="text"   required
  - countryCode  <select>      +91, +1, +44, +33, +49, +81, +61, +971, +65
  - phone        type="tel"    required  (digits-only filter via onChange)
Submission Target:  registerGuest()  → supabase.from("guests").insert()  (client-side)
Current Problems:
  - No maxLength on name or phone
  - Name has only `name.length < 2` check (no min length on server)
  - Phone has ad-hoc length check per country code (hard-coded map)
  - No inputMode="numeric" on phone
  - Display name inserted without sanitization (XSS risk on admin view)
```

### 13. Find Me — Selfie Upload

```txt
Form Name:        Find My Photos (Selfie)
File Path:        app/event/[eventId]/find-me/page.tsx
Purpose:          Guest uploads selfie to find their photos
Who Uses It:      Guest
Fields:
  - camera selfie   type="file"  accept=image/jpeg,image/png,image/webp,image/heic  capture="user"
  - gallery image   type="file"  accept=same set  no capture
Submission Target:  POST /api/selfie/upload-url  (signed URL)  →
                     PUT to Supabase Storage  →
                     POST /api/selfie/confirm  (DB record)
Current Problems:
  - No file size check client-side (server trusts browser MIME)
  - Extension allowlist only on server
  - No virus/malware scanning
```

---

## Step 4 — Validation Logic Inventory

### Existing Validation Utilities

| Utility | Location | Used By | Status |
| ------- | -------- | ------- | ------ |
| `sanitizeText()` | `lib/auth-validate.ts` | login, register, forgot-password, update-password | ✅ Used |
| `validateEmail()` | `lib/auth-validate.ts` | login, register, forgot-password | ✅ Used |
| `validatePassword()` | `lib/auth-validate.ts` | register, update-password | ✅ Used |
| `validateFullName()` | `lib/auth-validate.ts` | register | ✅ Used (via `validateRegisterForm`) |
| `validateLoginForm()` | `lib/auth-validate.ts` | login | ✅ Used |
| `validateRegisterForm()` | `lib/auth-validate.ts` | register | ✅ Used |
| `containsDangerousInput()` | `lib/auth-validate.ts` | login, register | ✅ Used internally |
| `getAuthErrorMessage()` | `lib/auth-errors.ts` | login, register, forgot-password, update-password | ✅ Used |
| `getUrlAuthErrorMessage()` | `lib/auth-errors.ts` | login | ✅ Used |
| `rateLimit()` | `lib/rate-limit.ts` | `/api/inquire` | ✅ Used |

### Validation Utilities NOT Yet Built

| Gap | Implication |
| --- | ----------- |
| `validatePhone()` | No reusable phone validator — Verify page has ad-hoc per-country rules; Create Event modal has none; Inquire form has none |
| `validateName()` for non-auth flows | Admin create/edit photographer, Create Event admin name, Inquire name have no validation |
| `validateEventType()` / enum guard | Any string can be sent to `eventType` field on inquiries |
| `validateGuestCount()` | Accepts arbitrary string (button group is hard-coded — safe) |
| `validateUrl()` for cover_url | Not used anywhere — relies on Supabase only |
| `validateDate()` / `validateFutureDate()` | Date fields rely on `<input type="date">` browser-native only |
| `validateBio()` / `validateStory()` | Free-text fields with no length cap or sanitization |
| zod / yup / schema library | **Not used anywhere** — all validation is hand-written |

### Form-Validation Library Usage

```txt
zod  : ❌ Not used
yup  : ❌ Not used
joi  : ❌ Not used
validator (npm) : ❌ Not used
react-hook-form : ❌ Not used
```

All validation is ad-hoc inline checks + the four helpers in `lib/auth-validate.ts`.

---

## Step 5 — Input Type Audit

### Email Fields

| Field | Current | Expected | File |
| --- | --- | --- | --- |
| Login email | `type="email"` ✅ | `type="email"` | login |
| Register email | `type="email"` ✅ | `type="email"` | register |
| Forgot password email | `type="email"` ✅ | `type="email"` | forgot-password |
| Public Contact email | `type="email"` ✅ | `type="email"` | contact |
| Inquire email | `type="email"` ✅ | `type="email"` | inquire |
| Create Event admin email | `type="email"` ✅ | `type="email"` | shell.tsx |
| Admin Create photographer email | `type="email"` ✅ | `type="email"` | admin-panels.tsx |
| Admin Inquiries search | `type="text"` | n/a (search) | admin-panels.tsx |

### Phone Fields

| Field | Current | Expected | File |
| --- | --- | --- | --- |
| Public Inquire phone | `type="tel"` ✅ | `type="tel"` + `inputMode="tel"` | inquire |
| Create Event admin phone | `type="tel"` ✅ | `type="tel"` + `inputMode="tel"` | shell.tsx |
| Verify phone | `type="tel"` ✅ | `type="tel"` + `inputMode="numeric"` | verify |
| Admin Photographer phone (create) | `type="text"` ❌ | `type="tel"` | admin-panels.tsx |
| Admin Photographer phone (edit) | `type="text"` ❌ | `type="tel"` | admin-panels.tsx |

### Date / Number / Other Fields

| Field | Current | Expected |