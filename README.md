# Spotme — MVP Architecture

## Overview

Spotme is an AI-powered event photo platform where:

* Photographers create events and upload photos.
* Guests scan a QR code and upload a selfie.
* AI automatically finds matching photos.
* If no photos are found immediately, guests are notified later on WhatsApp.

The product is optimized for:

* Fast onboarding
* Minimal friction
* AI photo matching
* WhatsApp-based engagement
* Event workflows

---

# Final MVP Folder Structure

```text
Spotme/
│
├── app/
│   │
│   ├── (landing)/
│   │   ├── page.tsx                     # Landing page
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── features/
│   │   │   └── page.tsx
│   │   └── about/
│   │       └── page.tsx
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── dashboard/
│   │   │
│   │   ├── page.tsx                     # Main dashboard
│   │   │
│   │   ├── events/
│   │   │   ├── page.tsx                 # All events
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   └── [eventId]/
│   │   │       ├── page.tsx
│   │   │       ├── attendees/
│   │   │       │   └── page.tsx         # WhatsApp attendee list
│   │   │       ├── uploads/
│   │   │       │   └── page.tsx
│   │   │       ├── qr/
│   │   │       │   └── page.tsx
│   │   │       └── settings/
│   │   │           └── page.tsx
│   │   │
│   │   ├── storage/
│   │   │   └── page.tsx
│   │   │
│   │   └── account/
│   │       └── page.tsx
│   │
│   ├── event/
│   │   └── [eventId]/
│   │       │
│   │       ├── page.tsx                 # Event public page
│   │       │
│   │       ├── join/
│   │       │   └── page.tsx             # WhatsApp number input
│   │       │
│   │       ├── selfie/
│   │       │   └── page.tsx             # Upload selfie
│   │       │
│   │       ├── photos/
│   │       │   └── page.tsx             # AI matched photos
│   │       │
│   │       └── waiting/
│   │           └── page.tsx             # “We’ll notify you on WhatsApp”
│   │
│   ├── api/
│   │   │
│   │   ├── upload/
│   │   ├── events/
│   │   ├── ai-match/
│   │   ├── qr/
│   │   ├── whatsapp/
│   │   └── auth/
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── loading.tsx
│
├── components/
│   │
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── modal.tsx
│   │
│   ├── landing/
│   │   ├── hero.tsx
│   │   ├── pricing.tsx
│   │   ├── navbar.tsx
│   │   └── features.tsx
│   │
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── upload-zone.tsx
│   │   └── attendee-table.tsx
│   │
│   └── shared/
│       ├── logo.tsx
│       ├── loader.tsx
│       └── empty-state.tsx
│
├── lib/
│   │
│   ├── supabase.ts                     # Supabase client
│   ├── ai.ts                           # DeepFace / ArcFace logic
│   ├── whatsapp.ts                     # WhatsApp notifications
│   ├── qr.ts                           # QR generation
│   └── utils.ts
│
├── hooks/
│   ├── use-upload.ts
│   ├── use-toast.ts
│   └── use-mobile.ts
│
├── store/
│   ├── auth-store.ts
│   ├── event-store.ts
│   └── upload-store.ts
│
├── types/
│   ├── user.ts
│   ├── event.ts
│   ├── photo.ts
│   └── attendee.ts
│
├── public/
│   ├── images/
│   ├── logos/
│   └── icons/
│
├── styles/
│   └── animations.css
│
├── middleware.ts
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
├── package.json
└── .env
```

---

# Core Product Flow

## Photographer Flow

```text
Login
→ Create Event
→ Upload Photos
→ AI Processing
→ QR Code Generated
→ Share QR At Event
```

---

## Event Attendee Flow

```text
Scan QR
→ Enter WhatsApp Number verification
→ Upload Selfie
→ AI Searches Photos
→ View Photos
OR
→ Wait For WhatsApp Notification
```

---

# Core MVP Tech Stack

## Frontend

* Next.js
* React
* Tailwind CSS
* Zustand

## Backend

* Supabase
* Supabase Auth
* Supabase Storage
* PostgreSQL + pgvector

## AI Recognition

* DeepFace
* ArcFace
* RetinaFace

## Notifications

* WhatsApp API

---

# Core MVP Features

## Photographer

* Create event
* Upload photos
* Generate QR codes
* View attendees
* Manage storage

## Guest

* Scan QR
* Upload selfie
* View AI matched photos
* Receive WhatsApp notification if photos are not ready

---

# Product Philosophy

The product should feel:

* Fast
* Invisible
* Emotional
* Simple

Guests should never feel like they are using complex software.

The core magic moment is:

```text
Upload selfie
→ instantly see your event photos
```