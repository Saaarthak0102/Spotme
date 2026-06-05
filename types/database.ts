// ============================================================
// Spotme — Supabase Database Types
// Mirrors the schema in supabase/schema.sql
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// -------------------------------------------------------
// Plain types (use these in your app code)
// -------------------------------------------------------

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "photographer";
  phone: string | null;
  bio: string | null;
  plan: "free" | "pro" | "unlimited";
  max_events: number;
  max_storage_gb: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  owner_id: string;
  name: string;
  venue: string | null;
  event_date: string | null;
  event_type: "marriage" | "hackathon" | "meetup" | "corporate" | "other";
  cover_url: string | null;
  admin_name: string | null;
  admin_phone: string | null;
  admin_email: string | null;
  qr_active: boolean;
  privacy_mode: boolean;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface EventPhoto {
  id: string;
  event_id: string;
  storage_path: string;
  public_url: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

export interface Guest {
  id: string;
  event_id: string;
  phone: string;
  display_name: string | null;
  created_at: string;
}

export interface GuestSelfie {
  id: string;
  guest_id: string;
  event_id: string;
  storage_path: string;
  public_url: string | null;
  status: "uploaded" | "processing" | "matched";
  uploaded_at: string;
}

export interface PhotoMatch {
  id: string;
  event_photo_id: string;
  guest_selfie_id: string;
  guest_id: string;
  matched_at: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  event_date: string | null;
  location: string | null;
  event_type: string | null;
  guest_count: string | null;
  story: string | null;
  created_at: string;
}

// -------------------------------------------------------
// Insert / Update helpers
// -------------------------------------------------------

export type ProfileInsert = Partial<Profile> & { id: string };
export type ProfileUpdate = Partial<Profile>;

export type EventInsert = Omit<Event, "created_at" | "updated_at"> & {
  id?: string;
  qr_active?: boolean;
  status?: Event["status"];
};
export type EventUpdate = Partial<Omit<Event, "id" | "owner_id" | "created_at" | "updated_at">>;

export type EventPhotoInsert = Omit<EventPhoto, "id" | "uploaded_at"> & { id?: string };
export type EventPhotoUpdate = Partial<Omit<EventPhoto, "id" | "uploaded_at">>;

export type GuestInsert = Omit<Guest, "id" | "created_at"> & { id?: string };
export type GuestUpdate = Partial<Omit<Guest, "id" | "created_at">>;

export type GuestSelfieInsert = Omit<GuestSelfie, "id" | "uploaded_at"> & { id?: string };
export type GuestSelfieUpdate = Partial<Omit<GuestSelfie, "id" | "uploaded_at">>;

export type PhotoMatchInsert = Omit<PhotoMatch, "id" | "matched_at"> & { id?: string };
export type PhotoMatchUpdate = Partial<Omit<PhotoMatch, "id" | "matched_at">>;

export type InquiryInsert = Omit<Inquiry, "id" | "created_at"> & { id?: string; created_at?: string };
export type InquiryUpdate = Partial<Omit<Inquiry, "id" | "created_at">>;

// -------------------------------------------------------
// Database definition (used by createClient<Database>())
// Requires Relationships key to satisfy GenericTable constraint
// -------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
        Relationships: [];
      };
      event_photos: {
        Row: EventPhoto;
        Insert: EventPhotoInsert;
        Update: EventPhotoUpdate;
        Relationships: [];
      };
      guests: {
        Row: Guest;
        Insert: GuestInsert;
        Update: GuestUpdate;
        Relationships: [];
      };
      guest_selfies: {
        Row: GuestSelfie;
        Insert: GuestSelfieInsert;
        Update: GuestSelfieUpdate;
        Relationships: [];
      };
      photo_matches: {
        Row: PhotoMatch;
        Insert: PhotoMatchInsert;
        Update: PhotoMatchUpdate;
        Relationships: [];
      };
      inquiries: {
        Row: Inquiry;
        Insert: InquiryInsert;
        Update: InquiryUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: {
        Row: Record<string, unknown>;
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      event_type: "marriage" | "hackathon" | "meetup" | "corporate" | "other";
      event_status: "draft" | "active" | "archived";
      selfie_status: "uploaded" | "processing" | "matched";
    };
  };
}
