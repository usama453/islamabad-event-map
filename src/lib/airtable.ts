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

function buildDescription(
  input: CreateEntryInput,
  includeOrganizerInDescription: boolean
): string | undefined {
  const metaLines: string[] = [];
  if (includeOrganizerInDescription) {
    metaLines.push(`Organizer: ${input.organizerName.trim()}`);
  }
  if (input.contactPhone?.trim()) {
    metaLines.push(`Contact: ${input.contactPhone.trim()}`);
  }
  const body = input.description?.trim() ?? "";
  if (metaLines.length === 0) return body || undefined;
  return body ? `${metaLines.join("\n")}\n\n${body}` : metaLines.join("\n");
}

function isUnknownFieldError(error: unknown, fieldName: string): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes(`Unknown field name: "${fieldName}"`) ||
    message.includes(`Unknown field name: '${fieldName}'`)
  );
}

export async function createPendingEntry(
  input: CreateEntryInput
): Promise<Entry> {
  const organizer = input.organizerName.trim();
  if (!organizer) {
    throw new Error("Your name is required");
  }

  // Airtable single-select options are capitalized: Event / Place
  const baseFields: FieldSet = {
    Type: input.type === "place" ? "Place" : "Event",
    Title: input.title,
    Category: input.category,
    Status: "pending",
    Organizer: organizer,
  };

  if (input.lat != null) baseFields.Lat = input.lat;
  if (input.lng != null) baseFields.Lng = input.lng;
  if (input.locationText) baseFields.LocationText = input.locationText;
  if (input.sourceUrl) baseFields.SourceURL = input.sourceUrl;
  if (input.eventDate) baseFields.EventDate = input.eventDate;
  if (input.eventEndDate) baseFields.EventEndDate = input.eventEndDate;

  const table = getBase()(TABLE_NAME);

  try {
    const description = buildDescription(input, false);
    if (description) baseFields.Description = description;
    const [record] = await table.create([{ fields: baseFields }]);
    return mapRecord(record);
  } catch (error) {
    // Base may not have Organizer column yet — fall back to Description metadata
    if (!isUnknownFieldError(error, "Organizer")) throw error;

    console.warn(
      'Airtable is missing an "Organizer" single-line text field on Entries. ' +
        "Add it in Airtable so names are queryable as a real column."
    );

    const withoutOrganizer: FieldSet = { ...baseFields };
    delete withoutOrganizer.Organizer;
    const description = buildDescription(input, true);
    if (description) withoutOrganizer.Description = description;
    const [record] = await table.create([{ fields: withoutOrganizer }]);
    return mapRecord(record);
  }
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
