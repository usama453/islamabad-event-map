import type { DateFilter } from "./constants";
import {
  CATEGORY_IMAGE_POOLS,
  CATEGORY_LABELS,
  PLACE_IMAGES,
} from "./constants";
import type { Entry } from "./types";

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Stable thumbnail per listing — place overrides first, else category pool */
export function getEntryImage(entry: Entry): string {
  const title = entry.title.toLowerCase();
  for (const place of PLACE_IMAGES) {
    if (title.includes(place.match)) return place.url;
  }

  const pool = CATEGORY_IMAGE_POOLS[entry.category];
  const index = hashString(entry.id || entry.title) % pool.length;
  return pool[index];
}

export function hasCoordinates(entry: Entry): boolean {
  return entry.lat != null && entry.lng != null;
}

/** Nudge stacked pins so events/places at the same spot both stay visible */
export function mapPinPosition(
  entry: Entry,
  siblings: Entry[]
): { lat: number; lng: number } {
  const lat = entry.lat!;
  const lng = entry.lng!;
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const stack = siblings.filter(
    (e) =>
      e.lat != null &&
      e.lng != null &&
      `${e.lat.toFixed(5)},${e.lng.toFixed(5)}` === key
  );
  if (stack.length <= 1) return { lat, lng };

  const index = stack.findIndex((e) => e.id === entry.id);
  const angle = (index / stack.length) * Math.PI * 2 - Math.PI / 2;
  const radius = 0.0011; // ~120m — enough to separate overlapping pins
  return {
    lat: lat + Math.sin(angle) * radius,
    lng: lng + Math.cos(angle) * radius,
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isEventUpcoming(entry: Entry, today = new Date()): boolean {
  if (!entry.eventDate) return true;
  const eventDay = startOfDay(new Date(entry.eventDate));
  return eventDay >= startOfDay(today);
}

const SOON_WITHIN_DAYS = 3;

/** Days until event start (0 = today). Null if not an upcoming dated event. */
export function daysUntilEvent(
  entry: Entry,
  today = new Date()
): number | null {
  if (entry.type !== "event" || !entry.eventDate) return null;
  const eventDay = startOfDay(new Date(entry.eventDate));
  const now = startOfDay(today);
  const days = Math.round(
    (eventDay.getTime() - now.getTime()) / 86_400_000
  );
  if (days < 0) return null;
  return days;
}

export function isEventHappeningSoon(
  entry: Entry,
  today = new Date()
): boolean {
  const days = daysUntilEvent(entry, today);
  return days != null && days <= SOON_WITHIN_DAYS;
}

export function happeningSoonLabel(
  entry: Entry,
  today = new Date()
): string | null {
  const days = daysUntilEvent(entry, today);
  if (days == null || days > SOON_WITHIN_DAYS) return null;
  if (days === 0) return "Happening today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function matchesDateFilter(
  entry: Entry,
  filter: DateFilter,
  today = new Date()
): boolean {
  if (!entry.eventDate) return filter === "upcoming";

  const eventDay = startOfDay(new Date(entry.eventDate));
  const now = startOfDay(today);

  if (eventDay < now) return false;

  if (filter === "upcoming") return true;

  if (filter === "today") {
    return eventDay.getTime() === now.getTime();
  }

  const weekEnd = endOfWeek(today);
  return eventDay <= weekEnd;
}

export function sortEntries(
  entries: Entry[],
  type: "all" | "event" | "place"
): Entry[] {
  const sorted = [...entries];

  if (type === "all") {
    // Events first (soonest), then places A–Z
    sorted.sort((a, b) => {
      if (a.type !== b.type) return a.type === "event" ? -1 : 1;
      if (a.type === "event") {
        if (!a.eventDate && !b.eventDate) return a.title.localeCompare(b.title);
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      }
      return a.title.localeCompare(b.title);
    });
    return sorted;
  }

  if (type === "event") {
    sorted.sort((a, b) => {
      if (!a.eventDate && !b.eventDate) return a.title.localeCompare(b.title);
      if (!a.eventDate) return 1;
      if (!b.eventDate) return -1;
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    });
  } else {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  }

  return sorted;
}

function hasClockTime(iso: string): boolean {
  return /T\d{2}:\d{2}/.test(iso);
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function daySpan(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function formatEventDate(entry: Entry): string | null {
  if (!entry.eventDate) return null;

  const start = new Date(entry.eventDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };

  if (entry.eventEndDate) {
    const end = new Date(entry.eventEndDate);
    if (end.toDateString() !== start.toDateString()) {
      return `${start.toLocaleDateString("en-PK", options)} – ${end.toLocaleDateString("en-PK", options)}`;
    }
  }

  return start.toLocaleDateString("en-PK", options);
}

/** Optional `Time: …` / `Contact: …` lines in description (Airtable schema workarounds) */
function extractMetaLine(description: string | undefined, key: string): string | null {
  if (!description) return null;
  const match = description.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || null;
}

function extractEventTime(entry: Entry): string | null {
  return extractMetaLine(entry.description, "Time");
}

export function entryContactPhone(entry: Entry): string | undefined {
  if (entry.contactPhone?.trim()) return entry.contactPhone.trim();
  return extractMetaLine(entry.description, "Contact") ?? undefined;
}

/** Description without metadata lines (Time / Contact) */
export function entryBodyText(entry: Entry): string | undefined {
  if (!entry.description) return undefined;
  const cleaned = entry.description
    .replace(/^Time:\s*.+$/im, "")
    .replace(/^Contact:\s*.+$/im, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned || undefined;
}

/** Card-friendly schedule: date + time, or multi-day duration */
export function formatEventSchedule(entry: Entry): string | null {
  if (!entry.eventDate) return null;

  const start = new Date(entry.eventDate);
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  const timeNote = extractEventTime(entry);

  if (entry.eventEndDate) {
    const end = new Date(entry.eventEndDate);
    if (end.toDateString() !== start.toDateString()) {
      const days = daySpan(start, end);
      const range = `${start.toLocaleDateString("en-PK", dateOpts)} – ${end.toLocaleDateString("en-PK", dateOpts)}`;
      return timeNote ? `${range} · ${timeNote}` : `${range} · ${days} days`;
    }

    if (hasClockTime(entry.eventDate) || hasClockTime(entry.eventEndDate)) {
      const date = start.toLocaleDateString("en-PK", dateOpts);
      return `${date} · ${formatClock(start)} – ${formatClock(end)}`;
    }
  }

  const date = start.toLocaleDateString("en-PK", dateOpts);
  if (hasClockTime(entry.eventDate)) {
    return `${date} · ${formatClock(start)}`;
  }
  if (timeNote) return `${date} · ${timeNote}`;

  return date;
}

/** Short date for map pills, e.g. "Jul 15" */
export function formatShortDate(entry: Entry): string | null {
  if (!entry.eventDate) return null;
  const d = new Date(entry.eventDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Airbnb-style map pin label */
export function pinLabel(entry: Entry): string {
  if (entry.type === "event") {
    return formatShortDate(entry) ?? CATEGORY_LABELS[entry.category];
  }
  return CATEGORY_LABELS[entry.category];
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}
