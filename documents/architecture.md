# System Architecture

This document provides a comprehensive overview of the **Spotme** system architecture, the technologies used, component interactions, and the required environment configuration.

---

## 1. High-Level System Overview

Spotme is an AI-powered event photography platform designed to deliver instant photo discovery for guests. 

```mermaid
graph TD
    %% Component Definitions
    Client[Event Guest / Photographer]
    NextApp[Next.js App Router Web Server]
    Supabase[Supabase Platform]
    AIService[FastAPI AI Face Recognition Service]

    %% Interactions
    Client -->|1. Browses / Uploads / Joins| NextApp
    NextApp -->|2. Authenticates / Queries Data| Supabase
    NextApp -->|3. Signed URLs / Object Storage| Supabase
    NextApp -->|4. Triggers Face Processing| AIService
    AIService -->|5. Fetches Photos / Saves Vectors| Supabase
```

The system comprises three core components:
1. **Next.js Web Frontend & API Server**: Serves responsive pages to photographers and guests, manages auth/sessions, and handles meta database inserts and transaction control.
2. **Supabase Cloud Backend**: Serves as the storage provider (buckets for event covers, original photos, and selfies), authentication authority, and relational database hosting the `pgvector` index.
3. **FastAPI AI Face Recognition Service**: Runs in a Python environment to execute compute-heavy face detection (SCRFD) and facial recognition (ArcFace via ONNX) on uploaded media.

---

## 2. Technology Stack

### Frontend & Web Application
* **Framework**: Next.js 16.2.6 (App Router)
* **Library**: React 19.2.4
* **Styling**: Tailwind CSS v4 (using Modern CSS utility variables)
* **State Management**: Zustand (for UI states, uploading queues, and authentication variables)
* **Icons**: Google Material Symbols

### Database & Backend Services
* **Provider**: Supabase
* **Database**: PostgreSQL (v15+)
* **Vector Database Extension**: `pgvector` (512-dimension vector representations for face embeddings)
* **Storage**: Supabase Storage Buckets (S3-compatible API with pre-signed URLs)
* **Auth**: Supabase Auth (JWT credentials, sessions, and secure cookies)

### AI Face Recognition Service
* **Framework**: FastAPI (Python 3.10+)
* **Concurrency**: Uvicorn server utilizing `asyncio.Semaphore` task queuing
* **Computer Vision**: OpenCV (`cv2` for image loading, validation, and encoding)
* **Deep Learning Framework**: ONNX Runtime (optimized for CPU execution)
* **Inference Model (buffalo_l)**:
  * **Face Detection**: SCRFD (Sub-millisecond Face Detection)
  * **Face Recognition/Feature Extraction**: ArcFace (normed 512-dimension output embeddings)
* **Process Monitor**: `psutil` (for live free RAM tracking)

---

## 3. Core Component Flows

### A. Photographer Upload & AI Indexing Flow
When a photographer uploads a photo to an event dashboard:

```mermaid
sequenceDiagram
    autonumber
    actor P as Photographer
    participant FE as Next.js Dashboard
    participant API as Next.js API (/api/photos)
    participant S3 as Supabase Storage
    participant DB as Postgres DB
    participant AI as FastAPI Service (/index)

    P->>FE: Select photos & upload
    FE->>S3: Upload original photo to 'event-photos' bucket
    S3-->>FE: Return public photo URL
    FE->>API: POST /api/photos (meta payload + public URL)
    API->>DB: Insert event_photos row (face_indexed = false)
    API-)AI: HTTP POST /index (fire-and-forget background task)
    API-->>FE: Return 200 OK (Photo registered)
    
    rect rgb(240, 245, 255)
        note right of AI: Async Indexing Thread
        AI->>AI: Download photo to temp directory
        AI->>AI: SCRFD face detection & ArcFace feature extraction
        AI->>DB: Insert face embeddings (512-dim vector) into public.face_embeddings
        AI->>DB: UPDATE public.event_photos SET face_indexed=true, face_indexed_at=now()
        AI->>AI: Delete temp photo file
    end
```

### B. Guest Onboarding, Selfie Matching & Photo Retrieval Flow
When a guest scans a QR code to join an event:

```mermaid
sequenceDiagram
    autonumber
    actor G as Guest
    participant FE as Next.js Public Site
    participant DB as Postgres DB
    participant API_URL as Next.js API (/api/selfie/upload-url)
    participant API_CONF as Next.js API (/api/selfie/confirm)
    participant S3 as Supabase Storage
    participant API_AI as Next.js API (/api/ai/embed-selfie)
    participant AI as FastAPI Service (/embed-selfie)

    G->>FE: Scan QR & Enter name/phone number
    FE->>DB: Insert guest record
    FE->>API_URL: POST /api/selfie/upload-url (request signed path)
    API_URL-->>FE: Return short-lived signed upload URL & storage path
    FE->>S3: PUT selfie image bytes directly to 'guest-selfies' bucket
    Note over FE,S3: Bypasses Vercel's 4.5MB request limit
    FE->>API_CONF: POST /api/selfie/confirm (storage path, guestId, eventId)
    API_CONF->>DB: Delete previous matches & insert guest_selfies (status = 'uploaded')
    API_CONF-->>FE: Return public URL of selfie
    FE->>API_AI: POST /api/ai/embed-selfie (guestId, eventId, selfieUrl)
    API_AI-)AI: HTTP POST /embed-selfie (fire-and-forget background task)
    API_AI-->>FE: Return 202 processing status

    rect rgb(245, 240, 255)
        note right of AI: Async Matching Thread
        AI->>AI: Download selfie image
        AI->>AI: Detect faces, choose largest face, extract ArcFace embedding
        AI->>DB: Query face_embeddings (cosine distance comparison <= 0.45)
        AI->>DB: Clear past matches & write matches to photo_matches cache
        AI->>DB: UPDATE guest_selfies SET status = 'matched'
        AI->>AI: Clean up temp selfie file
    end

    loop Poll every 3 seconds
        FE->>DB: Get guest selfie status & matches
        DB-->>FE: Return status (e.g. matched) & matchCount
    end
    FE->>FE: Render matched photos from cached photo_matches
```

---

## 4. Configuration & Environment Variables

### A. Next.js Web App (`.env.local`)
Required in the web application environment:

| Variable Name | Description | Example / Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public endpoint for the Supabase project | `https://[proj-ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client anonymous key | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin secret key (Server-only) | `eyJhbGciOi...` |
| `SUPABASE_ACCESS_KEY_ID` | Storage access key ID (S3 protocol) | `3f68b391a...` |
| `SUPABASE_SECRET_ACCESS_KEY` | Storage secret access key (S3 protocol) | `d002bdeeb...` |
| `NEXT_PUBLIC_AI_SERVICE_URL` | Host url of the FastAPI AI Service | `http://127.0.0.1:8000` |
| `DATABASE_PASSWORD` | Postgres database superuser password | `[password-here]` |

### B. FastAPI AI Service (`ai-service/.env`)
Required in the python service environment:

| Variable Name | Description | Example / Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string for Postgres (prefer transaction pooler port `6543`) | `postgresql://postgres.[ref]:[pass]@[host].pooler.supabase.com:6543/postgres?sslmode=require` |
| `SUPABASE_URL` | Public endpoint for Supabase API requests | `https://[proj-ref].supabase.co` |
| `SUPABASE_KEY` | Supabase Service Role Key (for storage uploads) | `eyJhbGciOi...` |
| `PORT` | Local binding port | `8000` |
| `HOST` | Local network binding address | `0.0.0.0` |
| `MAX_CONCURRENT_AI` | Limit of concurrent face inference jobs running | `1` (for 512MB RAM), `3` (for 2GB RAM) |
| `MAX_QUEUE_SIZE` | Maximum depth of background task queue | `10` |
| `MIN_FREE_RAM_MB` | RAM boundary limit to prevent OOM termination | `200` |

---

## 5. Architectural Quality Guards

* **Memory Protection**: FastAPI monitors memory usage on each request via `psutil`. If free RAM falls below `MIN_FREE_RAM_MB` (default 200MB), the request is rejected with `503 Service Unavailable` to protect the host container from OOM crashes.
* **Concurrency Gates**: A global `asyncio.Semaphore` tracks active ONNX model loads and runs. This serializes hardware intensive execution to prevent massive CPU throttling or starvation.
* **Storage Bypass**: Signed upload URLs generated by Supabase Storage are used directly by client browsers. This ensures that large files (e.g. 10MB+ photographer uploads or high-resolution guest selfies) bypass the Next.js server limits, reducing memory and bandwidth consumption.
* **Caching Layer**: Results of the vector search are stored directly in the `photo_matches` database table. The web application only performs lightweight SQL reads on page loads instead of requesting AI model execution, optimizing battery, bandwidth, and API consumption.
