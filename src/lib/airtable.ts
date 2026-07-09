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
  const organizerFromDesc = description
    ?.match(/^Organizer:\s*(.+)$/im)?.[1]
    ?.trim();
  const organizerFromField = fields.Organizer
    ? String(fields.Organizer).trim()
    : "";

  return {
    id: record.id,
    type: parseType(fields.Type),
    title: String(fields.Title ?? ""),
    description,
    category: parseCategory(fields.Category),
    organizerName: organizerFromField || organizerFromDesc || "",
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

  // Organizer / Contact stored as Description metadata (no extra columns required).
  // Optional Airtable `Organizer` field is also read when present.
  const metaLines: string[] = [`Organizer: ${input.organizerName.trim()}`];
  if (input.contactPhone?.trim()) {
    metaLines.push(`Contact: ${input.contactPhone.trim()}`);
  }
  fields.Description = input.description?.trim()
    ? `${metaLines.join("\n")}\n\n${input.description.trim()}`
    : metaLines.join("\n");
  if (input.lat != null) fields.Lat = input.lat;
  if (input.lng != null) fields.Lng = input.lng;
  if (input.locationText) fields.LocationText = input.locationText;
  if (input.sourceUrl) fields.SourceURL = input.sourceUrl;
  if (input.eventDate) fields.EventDate = input.eventDate;
  if (input.eventEndDate) fields.EventEndDate = input.eventEndDate;

  const [record] = await getBase()(TABLE_NAME).create([{ fields }]);
  return mapRecord(record);
}

const SUBSCRIBERS_TABLE = "Subscribers";

export async function subscribeEmail(
  email: string
): Promise<{ alreadySubscribed: boolean }> {
  const base = getBase();
  const normalized = email.trim().toLowerCase();
  const escaped = normalized.replace(/'/g, "\\'");

  const existing = await base(SUBSCRIBERS_TABLE)
    .select({
      filterByFormula: `LOWER({Email}) = '${escaped}'`,
      maxRecords: 1,
    })
    .firstPage();

  if (existing.length > 0) {
    return { alreadySubscribed: true };
  }

  try {
    await base(SUBSCRIBERS_TABLE).create([
      {
        fields: {
          Email: normalized,
          Status: "active",
        },
      },
    ]);
  } catch {
    // Status column is optional — retry with Email only
    await base(SUBSCRIBERS_TABLE).create([
      {
        fields: {
          Email: normalized,
        },
      },
    ]);
  }

  return { alreadySubscribed: false };
}
