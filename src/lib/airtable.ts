import Airtable, { FieldSet, Records } from "airtable";
import { CATEGORIES, type Category } from "./constants";
import type { CreateEntryInput, Entry, EntryStatus } from "./types";

const TABLE_NAME = "Entries";

function getBase() {
  const apiKey = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    throw new Error("Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID");
  }

  return new Airtable({ apiKey }).base(baseId);
}

function parseCategory(value: unknown): Category {
  if (typeof value === "string" && CATEGORIES.includes(value as Category)) {
    return value as Category;
  }
  return "other";
}

function parseType(value: unknown): "event" | "place" {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "place" ? "place" : "event";
}

function parseStatus(value: unknown): EntryStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "approved" || normalized === "rejected") return normalized;
  return "pending";
}

function mapRecord(record: Airtable.Record<FieldSet>): Entry {
  const fields = record.fields;
  const description = fields.Description
    ? String(fields.Description)
    : undefined;
  const contactFromDesc = description?.match(/^Contact:\s*(.+)$/im)?.[1]?.trim();

  return {
    id: record.id,
    type: parseType(fields.Type),
    title: String(fields.Title ?? ""),
    description,
    category: parseCategory(fields.Category),
    lat: typeof fields.Lat === "number" ? fields.Lat : undefined,
    lng: typeof fields.Lng === "number" ? fields.Lng : undefined,
    locationText: fields.LocationText
      ? String(fields.LocationText)
      : undefined,
    sourceUrl: fields.SourceURL ? String(fields.SourceURL) : undefined,
    contactPhone: contactFromDesc || undefined,
    eventDate: fields.EventDate ? String(fields.EventDate) : undefined,
    eventEndDate: fields.EventEndDate
      ? String(fields.EventEndDate)
      : undefined,
    status: parseStatus(fields.Status),
    createdTime: record._rawJson.createdTime,
  };
}

/** Public listings: approved + pending (rejected stay hidden). */
export async function fetchPublicEntries(): Promise<Entry[]> {
  const records: Records<FieldSet> = await getBase()(TABLE_NAME)
    .select({
      // Case-insensitive; blank Status treated as pending; hide rejected
      filterByFormula:
        "OR(LOWER({Status}) = 'approved', LOWER({Status}) = 'pending', {Status} = BLANK())",
    })
    .all();

  return records.map(mapRecord);
}

export async function createPendingEntry(
  input: CreateEntryInput
): Promise<Entry> {
  // Airtable single-select options are capitalized: Event / Place
  const fields: FieldSet = {
    Type: input.type === "place" ? "Place" : "Event",
    Title: input.title,
    Category: input.category,
    Status: "pending",
  };

  // No ContactPhone column in Airtable yet — store as Description metadata
  let description = input.description;
  if (input.contactPhone?.trim()) {
    const phone = input.contactPhone.trim();
    description = description
      ? `Contact: ${phone}\n\n${description}`
      : `Contact: ${phone}`;
  }

  if (description) fields.Description = description;
  if (input.lat != null) fields.Lat = input.lat;
  if (input.lng != null) fields.Lng = input.lng;
  if (input.locationText) fields.LocationText = input.locationText;
  if (input.sourceUrl) fields.SourceURL = input.sourceUrl;
  if (input.eventDate) fields.EventDate = input.eventDate;
  if (input.eventEndDate) fields.EventEndDate = input.eventEndDate;

  const [record] = await getBase()(TABLE_NAME).create([{ fields }]);
  return mapRecord(record);
}
