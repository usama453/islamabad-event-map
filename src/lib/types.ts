import type { Category, EntryType } from "./constants";

export type EntryStatus = "pending" | "approved" | "rejected";

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  description?: string;
  category: Category;
  organizerName: string;
  lat?: number;
  lng?: number;
  locationText?: string;
  sourceUrl?: string;
  contactPhone?: string;
  eventDate?: string;
  eventEndDate?: string;
  /** User-uploaded Airtable attachment URLs (preferred over Unsplash fallback) */
  imageUrls?: string[];
  status: EntryStatus;
  createdTime: string;
}

export interface CreateEntryInput {
  type: EntryType;
  title: string;
  description?: string;
  category: Category;
  organizerName: string;
  lat?: number;
  lng?: number;
  locationText?: string;
  sourceUrl?: string;
  contactPhone?: string;
  eventDate?: string;
  eventEndDate?: string;
}

export interface PhotoUpload {
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface Comment {
  id: string;
  entryId: string;
  body: string;
  authorName: string;
  status: EntryStatus;
  createdTime: string;
}

export interface CreateCommentInput {
  entryId: string;
  body: string;
  /** Optional — server assigns a random username when blank */
  authorName?: string;
}
