import type { Category, EntryType } from "./constants";

export type EntryStatus = "pending" | "approved" | "rejected";

export interface Entry {
  id: string;
  type: EntryType;
  title: string;
  description?: string;
  category: Category;
  lat?: number;
  lng?: number;
  locationText?: string;
  sourceUrl?: string;
  contactPhone?: string;
  eventDate?: string;
  eventEndDate?: string;
  status: EntryStatus;
  createdTime: string;
}

export interface CreateEntryInput {
  type: EntryType;
  title: string;
  description?: string;
  category: Category;
  lat?: number;
  lng?: number;
  locationText?: string;
  sourceUrl?: string;
  contactPhone?: string;
  eventDate?: string;
  eventEndDate?: string;
}
