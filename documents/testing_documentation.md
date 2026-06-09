# Spotme & AI Service Platform Testing Documentation

This document provides a comprehensive testing suite and walkthrough for verifying the Spotme web frontend and the python AI service prior to production shipment.

---

## 1. Frontend Verification Plan

### A. Guest Onboarding & Redirection Flow
1. **Initial Visit**:
   - Open a browser and navigate to `/event/<eventId>`.
   - Verify that the invite landing screen displays properly with steps and the "Join This Event" button.
2. **New Verification**:
   - Click "Join This Event". You should be taken to `/event/<eventId>/verify`.
   - Enter your name and phone number. Click "Get Verification Code".
   - Confirm that the step indicator shifts to "Verify your number".
   - **Development fallback**: Since `mock` mode triggers in dev, type `123456` as the OTP.
   - Verify that registration succeeds, the cookie `spotme_guest_session` is set (expires in 2 days), and you are automatically redirected:
     - To `/event/<eventId>/find-me` if the event is a `'hackathon'` or has `privacy_mode` enabled.
     - To `/event/<eventId>/gallery` otherwise.
3. **Automatic Session Redirection**:
   - Once verified, attempt to navigate back to `/event/<eventId>` or `/event/<eventId>/verify`.
   - Verify that the `useGuestRedirect` hook immediately intercepts the load and automatically forwards you to the correct destination (`gallery`, `find-me`, or `my-photos` if a selfie exists) without flashing the onboarding form.

### B. Image Rendering & CDN Egress Verification
1. **Public Gallery & Thumbnail Grids**:
   - Navigate to the event gallery grid `/event/<eventId>/gallery`.
   - Open the browser DevTools (Network tab) and verify that the image URLs are mapped to:
     `https://<project-ref>.supabase.co/storage/v1/render/image/public/event-photos/...` with quality parameters like `?quality=75`.
   - Verify that there are no Next.js unconfigured host runtime errors.
2. **Lightbox Previews**:
   - Click on any photo to open the lightbox.
   - Verify the image source points to the `/storage/v1/render/image/public/...` path with `quality=80` compression.
   - **Original Dimensions**: Verify that image aspect ratios and resolutions are preserved (height and width are not shrunk down).
3. **High-Resolution Download**:
   - Click the "Download" button in the lightbox or sidebar.
   - Verify that it opens or downloads the original raw image via the uncompressed public URL.

### C. Admin Dashboard & Event Statistics Panel
1. **Events Grid**:
   - Navigate to `/admin/events`.
   - Verify that only **10 events** are displayed per page.
   - Verify the presence of the new **Identified** column (displaying `<matched_count> / <total_guests>`).
2. **Event Details Statistics Modal**:
   - Click on any event row in the table.
   - Verify that a bento-style modal overlays the screen containing:
     - **Guests & Face Matching**: Registered guests, selfies uploaded, unique identified, and match rate percentage.
     - **Photos & Detection**: Total photos, indexed count, faces detected, and progress percentage.
     - **Storage Capacity**: Combined file sizes of all event photos (formatted dynamically in KB, MB, or GB).
     - **AI Compute Performance**: Accurate aggregate processing duration spent by the AI service (e.g. `2m 14s`) and the average time per photo.
     - **Active AI Model**: Confirms the running models (`SCRFD + ArcFace`).
     - **Management**: Photographer owner name and contact email.
   - Click the "Close" or backdrop to close the modal.

---

## 2. Backend & API Endpoint Verification Plan

Execute the following `curl` requests or API validations from postman to verify backend routes.

### A. OTP Verification SMS Trigger
- **Request**:
  ```bash
  curl -X POST http://localhost:3000/api/guest/otp/send \
    -H "Content-Type: application/json" \
    -d '{"phone": "+919876543210"}'
  ```
- **Response Validation**:
  - Code `200 OK`.
  - Check the server console log. If using development mock fallback, it must output the code: `[2Factor OTP MOCK] Sent code 123456 to +919876543210`.

### B. Guest Status & Sync Status
- **Request**:
  ```bash
  curl -H "Cookie: spotme_guest_session=<token>" \
    "http://localhost:3000/api/guest/<eventId>/status?guestId=<guestId>"
  ```
- **Response Validation**:
  - Returns `selfieId`, `selfieUrl`, `status` (matched, uploaded, processing, no_face), `matchCount`, `eventType`, and `privacyMode`.

---

## 3. Python AI-Service Verification Plan

### A. Polling Worker Thread Verification
1. Start the FastAPI service:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```
2. Verify startup logs in stdout:
   - `PostgreSQL connection pool established.`
   - `Loading InsightFace models (SCRFD + ArcFace ONNX)...`
   - `InsightFace buffalo_l (SCRFD + ArcFace) loaded successfully.`
   - `Starting background photo processing worker...`

### B. Bidirectional Face Matching Tests
1. **Selfie Upload & Indexing**:
   - Upload a guest selfie.
   - Confirm that the polling worker thread outputs:
     `[EMBED_SELFIE] Processing selfie for guest <guest_id> in event <event_id>`
   - Verify that the database `guest_selfies` table row now has its `embedding` column populated with the 512-dimensional vector.
2. **New Photo Upload & Matching**:
   - As a photographer, upload a new event photo containing the guest's face.
   - Confirm that the worker thread outputs:
     - `[INDEX] Processing photo <photo_id> for event <event_id>`
     - `[INDEX] Face in photo <photo_id> matched guest <guest_id> (similarity=0.789)`
     - `[INDEX] Stored <N> embeddings for photo <photo_id>`
   - Verify that a matching record is inserted into the `public.photo_matches` table.
3. **Execution Duration Stats**:
   - Check the `event_photos` table.
   - Verify that `processing_time` contains the float representation of the exact execution duration (seconds) spent processing that image.
