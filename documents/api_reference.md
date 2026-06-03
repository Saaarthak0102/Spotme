# API Reference

This document maps all REST API endpoints available in both the Next.js Web App and the FastAPI Python AI Service, including request payloads, response bodies, status codes, and authorization rules.

---

## 1. Next.js Web App API Routes

All Next.js API routes reside under the `/api` directory. They handle authentication internally using Supabase session validation.

### A. Photographer Photo Management

#### `POST /api/photos`
Registers a newly uploaded event photo in the database and triggers the AI face indexing pipeline.
* **Headers**: `Content-Type: application/json`, Cookie (contains session credentials)
* **Request Body**:
  ```json
  {
    "event_id": "90a98c0b-1934-45fb-a5b7-789efdc89012",
    "storage_path": "photos/90a98c0b-1934-45fb-a5b7-789efdc89012/DSC_0102.jpg",
    "public_url": "https://[proj].supabase.co/storage/v1/object/public/event-photos/90a98c0b-1934-45fb-a5b7-789efdc89012/DSC_0102.jpg",
    "original_filename": "DSC_0102.jpg",
    "file_size_bytes": 4820120,
    "mime_type": "image/jpeg"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "id": "e44d3202-b01c-4395-885f-ebbb0299f012",
    "event_id": "90a98c0b-1934-45fb-a5b7-789efdc89012",
    "storage_path": "photos/90a98c0b-1934-45fb-a5b7-789efdc89012/DSC_0102.jpg",
    "public_url": "https://[proj].supabase.co/storage/v1/object/public/event-photos/90a98c0b-1934-45fb-a5b7-789efdc89012/DSC_0102.jpg",
    "thumb_url": null,
    "medium_url": null,
    "blur_hash": null,
    "original_filename": "DSC_0102.jpg",
    "file_size_bytes": 4820120,
    "mime_type": "image/jpeg",
    "face_indexed": false,
    "face_indexed_at": null,
    "uploaded_at": "2026-06-02T17:15:32.124Z"
  }
  ```
* **Error Responses**:
  * `401 Unauthorized`: Session missing or expired.
  * `400 Bad Request`: Missing `event_id` or `storage_path`.
  * `404 Not Found`: Event does not exist, or is not owned by the current user.

---

### B. Guest Onboarding & Selfie Flow

#### `POST /api/selfie/upload-url`
Requests a pre-signed, short-lived upload URL so the guest browser can PUT their selfie image directly into the Supabase storage bucket (bypassing Vercel's request limits).
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "eventId": "90a98c0b-1934-45fb-a5b7-789efdc89012",
    "ext": "png"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "signedUrl": "https://[proj].supabase.co/storage/v1/s3/guest-selfies/selfies/90a98c0b...token=...",
    "storagePath": "selfies/90a98c0b-1934-45fb-a5b7-789efdc89012/1779961015124.png",
    "token": "eyJ..."
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing `eventId`.
  * `500 Internal Server Error`: S3 endpoint configuration issue.

#### `POST /api/selfie/confirm`
Called after the browser finishes uploading the selfie. Clears any old matched photos (if re-uploading a new selfie) and inserts the guest selfie record.
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "storagePath": "selfies/90a98c0b-1934-45fb-a5b7-789efdc89012/1779961015124.png",
    "guestId": "5cc32168-124b-4890-a241-0fbc49281a8b",
    "eventId": "90a98c0b-1934-45fb-a5b7-789efdc89012"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "publicUrl": "https://[proj].supabase.co/storage/v1/object/public/guest-selfies/selfies/90a98c0b-1934-45fb-a5b7-789efdc89012/1779961015124.png"
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing `storagePath` or `eventId`.

#### `POST /api/ai/embed-selfie`
Invokes the Python AI Face Recognition service to compute the selfie embedding, compare it using `pgvector` similarity, and populate the matches cache table.
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "guest_id": "5cc32168-124b-4890-a241-0fbc49281a8b",
    "event_id": "90a98c0b-1934-45fb-a5b7-789efdc89012",
    "selfie_url": "https://[proj].supabase.co/storage/v1/object/public/guest-selfies/selfies/90a98c0b-1934-45fb-a5b7-789efdc89012/1779961015124.png",
    "selfie_id": "fe87ac60-0a88-4db8-8422-921350a8cd5f"
  }
  ```
* **Success Responses**:
  * `200 OK`: `{"status": "processing"}` (AI processing started successfully).
  * `202 Accepted`: `{"status": "queued", "message": "AI service will process your selfie when available."}` (FastAPI failed or timed out, task is queued to run when healthy).
* **Error Responses**:
  * `429 Too Many Requests`: `{"status": "busy", "message": "AI service is busy. Please try again shortly."}` (Inference queue is full).
  * `503 Service Unavailable`: `{"status": "unavailable", "message": "AI service unavailable."}` (Server low on RAM).

---

### C. photographer Account Actions

#### `POST /api/payments/upgrade`
Simulates Stripe checkout webhooks and upgrades the photographer's limits.
* **Headers**: `Content-Type: application/json`, Cookie
* **Request Body**:
  ```json
  {
    "plan": "pro"  // 'free', 'pro', or 'unlimited'
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Successfully upgraded to pro plan.",
    "profile": {
      "id": "photographer-uuid",
      "plan": "pro",
      "max_events": 5,
      "max_storage_gb": 100
    }
  }
  ```

#### `DELETE /api/events/[eventId]`
Deletes the event metadata, cascades related rows in all tables, and purges cover/photo/selfie files from storage buckets.
* **Headers**: Cookie
* **Query Parameters**: `eventId` (Path parameter)
* **Success Response (200 OK)**:
  ```json
  {
    "success": true
  }
  ```
* **Error Responses**:
  * `401 Unauthorized`: Photographer session missing.
  * `403 Forbidden`: Photographer is not the owner of this event.
  * `404 Not Found`: Event not found.

#### `POST /api/inquire`
Receives customer contact form entries on the landing page and logs an SMTP simulation event.
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "name": "David Miller",
    "email": "david@example.com",
    "phone": "+15550199",
    "date": "2026-08-15",
    "location": "New York, NY",
    "eventType": "marriage",
    "guestCount": "150",
    "story": "Looking for photo delivery for our upcoming wedding."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "id": "inquiry-uuid",
    "name": "David Miller",
    "email": "david@example.com",
    "created_at": "2026-06-02T17:18:22.000Z"
  }
  ```

---

### D. System Admin API Routes

All endpoints in this section verify that the requesting user's profile role is `'admin'`.

#### `GET /api/admin/stats`
Fetches global platform stats, chart data, and event logs.
* **Success Response (200 OK)**:
  ```json
  {
    "stats": {
      "totalPhotographers": 45,
      "totalEvents": 128,
      "totalPhotos": 42095,
      "totalGuests": 1024,
      "activeEvents": 82,
      "thisMonthEvents": 14,
      "thisMonthPhotos": 3200,
      "thisMonthGuests": 412,
      "todayPhotos": 150,
      "todaySelfies": 32
    },
    "events": [...],
    "chartData": {
      "eventTypeBreakdown": [...],
      "planDistribution": [...],
      "monthlyGrowth": [...],
      "eventStatusBreakdown": [...],
      "topPhotographers": [...],
      "recentActivity": [...]
    }
  }
  ```

#### `GET /api/admin/inquiries`
Lists all public inquires received from the landing page.
* **Success Response (200 OK)**: `[ { "id": "uuid", "name": "David", ... } ]`

#### `DELETE /api/admin/inquiries?id=[inquiryId]`
Deletes a specific inquiry by ID.
* **Success Response (200 OK)**: `{"success": true}`

#### `GET /api/admin/ai-health`
Proxies the live health status of the FastAPI Python AI Service.
* **Success Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "model": "InsightFace buffalo_l (SCRFD + ArcFace ONNX)",
    "model_loaded": true,
    "active_jobs": 0,
    "max_concurrent": 1,
    "max_queue_size": 10,
    "ram_total_mb": 2048,
    "ram_free_mb": 1420,
    "ram_used_pct": 30.6,
    "database_connected": true
  }
  ```
* **Offline Fallback (503 Service Unavailable)**:
  ```json
  {
    "status": "offline",
    "error": "AI service is offline or unreachable."
  }
  ```

#### `GET /api/admin/photographers`
Lists all photographers, including their emails, plans, event counts, photo uploads, and active states.
* **Success Response (200 OK)**: `[ { "id": "uuid", "full_name": "...", "email": "...", "eventCount": 4, ... } ]`

#### `POST /api/admin/photographers`
Creates a new photographer profile (creates user in `auth` and inserts profile).
* **Request Body**:
  ```json
  {
    "full_name": "Sarah Connor",
    "email": "sarah@example.com",
    "password": "SecretPassword123",
    "phone": "+15559876",
    "bio": "Professional portrait photographer",
    "plan": "pro"
  }
  ```
* **Success Response (200 OK)**: `{"success": true}`

#### `PATCH /api/admin/photographers`
Updates an existing photographer's plan, name, bio, or phone.
* **Request Body**:
  ```json
  {
    "id": "photographer-uuid",
    "plan": "unlimited",
    "full_name": "Sarah Connor Reisse"
  }
  ```
* **Success Response (200 OK)**: `{"success": true}`

#### `DELETE /api/admin/photographers?id=[photographerId]`
Deletes a photographer account and triggers database cascading deletes.
* **Success Response (200 OK)**: `{"success": true}`

---

## 2. FastAPI AI Service Endpoints

The AI service operates on port `8000` (by default) and receives direct POST requests from the Next.js API routes.

#### `GET /health`
Returns system resources, ONNX model loading states, and database connection pool statistics.
* **Success Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "model": "InsightFace buffalo_l (SCRFD + ArcFace ONNX)",
    "model_loaded": true,
    "active_jobs": 0,
    "max_concurrent": 1,
    "max_queue_size": 10,
    "ram_total_mb": 2048,
    "ram_free_mb": 1124,
    "ram_used_pct": 45.1,
    "database_connected": true
  }
  ```

#### `POST /index`
Extracts face vectors from a newly uploaded photographer image and registers the embeddings.
* **Request Body**:
  ```json
  {
    "photo_id": "e44d3202-b01c-4395-885f-ebbb0299f012",
    "event_id": "90a98c0b-1934-45fb-a5b7-789efdc89012",
    "image_url": "https://[proj].supabase.co/storage/v1/object/public/event-photos/.../DSC_0102.jpg"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "status": "queued",
    "photo_id": "e44d3202-b01c-4395-885f-ebbb0299f012"
  }
  ```

#### `POST /embed-selfie`
Computes the embedding for the largest face in a guest's selfie, queries pgvector for matching photos in that event, and saves findings to `photo_matches`.
* **Request Body**:
  ```json
  {
    "guest_id": "5cc32168-124b-4890-a241-0fbc49281a8b",
    "event_id": "90a98c0b-1934-45fb-a5b7-789efdc89012",
    "selfie_url": "https://[proj].supabase.co/storage/v1/object/public/guest-selfies/.../selfie.jpg",
    "selfie_id": "fe87ac60-0a88-4db8-8422-921350a8cd5f",
    "threshold": 0.55
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "status": "processing",
    "guest_id": "5cc32168-124b-4890-a241-0fbc49281a8b"
  }
  ```

#### `POST /upload-selfie`
Multipart form upload utility. Decodes, validates, compresses to JPEG (quality 90), uploads to Supabase guest-selfies storage, and returns the URL.
* **Request (Multipart Form Data)**:
  * `file`: (Binary image data)
  * `guest_id`: `"5cc32168-124b-4890-a241-0fbc49281a8b"`
  * `event_id`: `"90a98c0b-1934-45fb-a5b7-789efdc89012"`
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "url": "https://[proj].supabase.co/storage/v1/object/public/guest-selfies/selfies/90a98c0b-1934-45fb-a5b7-789efdc89012/5cc32168-124b-4890-a241-0fbc49281a8b/1779961015124.jpg",
    "storage_path": "selfies/90a98c0b-1934-45fb-a5b7-789efdc89012/5cc32168-124b-4890-a241-0fbc49281a8b/1779961015124.jpg",
    "bucket": "guest-selfies",
    "guest_id": "5cc32168-124b-4890-a241-0fbc49281a8b",
    "event_id": "90a98c0b-1934-45fb-a5b7-789efdc89012",
    "size_bytes": 105432
  }
  ```

#### `POST /search`
Legacy synchronous search. Downloads selfie, runs detection, and queries DB immediately without background queue.
* **Request Body**:
  ```json
  {
    "event_id": "90a98c0b-1934-45fb-a5b7-789efdc89012",
    "selfie_url": "https://[proj].supabase.co/storage/v1/object/public/guest-selfies/.../selfie.jpg",
    "threshold": 0.55
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 2,
    "matches": [
      {
        "id": "e44d3202-b01c-4395-885f-ebbb0299f012",
        "storage_path": "photos/.../DSC_0102.jpg",
        "public_url": "https://...",
        "original_filename": "DSC_0102.jpg",
        "uploaded_at": "2026-06-02 17:15:32.124000+00:00",
        "similarity": 0.7412
      }
    ]
  }
  ```
