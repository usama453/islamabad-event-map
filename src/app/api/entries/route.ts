import { NextRequest, NextResponse } from "next/server";
import { createPendingEntry, fetchApprovedEntries } from "@/lib/airtable";
import { CATEGORIES } from "@/lib/constants";
import type { CreateEntryInput } from "@/lib/types";

export async function GET() {
  try {
    const entries = await fetchApprovedEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to fetch entries:", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 }
    );
  }
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Honeypot spam protection
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    const type = body.type === "place" ? "place" : "event";
    const title = String(body.title ?? "").trim();
    const description = body.description
      ? String(body.description).trim()
      : undefined;
    const category = String(body.category ?? "");
    const lat = body.lat != null ? Number(body.lat) : undefined;
    const lng = body.lng != null ? Number(body.lng) : undefined;
    const locationTbd = Boolean(body.locationTbd);
    let locationText = body.locationText
      ? String(body.locationText).trim()
      : undefined;
    const sourceUrl = body.sourceUrl
      ? String(body.sourceUrl).trim()
      : undefined;
    const contactPhone = body.contactPhone
      ? String(body.contactPhone).trim()
      : undefined;
    const eventDate = body.eventDate ? String(body.eventDate) : undefined;
    const eventEndDate = body.eventEndDate
      ? String(body.eventEndDate)
      : undefined;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json(
        { error: "Valid category is required" },
        { status: 400 }
      );
    }

    const hasCoords =
      lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

    // Places must always have a location
    if (type === "place") {
      if (!hasCoords && !locationText) {
        return NextResponse.json(
          {
            error:
              "Places require a location — pin it on the map or describe the area",
          },
          { status: 400 }
        );
      }
    }

    // Events may mark location as not finalised yet
    if (type === "event") {
      if (locationTbd) {
        locationText = "Location not finalised yet";
      } else if (!hasCoords && !locationText) {
        return NextResponse.json(
          {
            error:
              "Choose a location, describe an area, or mark location as not finalised yet",
          },
          { status: 400 }
        );
      }

      if (!eventDate) {
        return NextResponse.json(
          { error: "Event date is required for events" },
          { status: 400 }
        );
      }
    }

    // Source URL is optional — only validate when provided
    if (sourceUrl && !isValidUrl(sourceUrl)) {
      return NextResponse.json(
        { error: "Source URL must be a valid URL" },
        { status: 400 }
      );
    }

    if (contactPhone && contactPhone.length > 40) {
      return NextResponse.json(
        { error: "Contact number is too long" },
        { status: 400 }
      );
    }

    const input: CreateEntryInput = {
      type,
      title,
      description,
      category: category as CreateEntryInput["category"],
      lat: hasCoords && !locationTbd ? lat : undefined,
      lng: hasCoords && !locationTbd ? lng : undefined,
      // Keep address text even when a pin is set
      locationText: locationTbd
        ? locationText
        : locationText || undefined,
      sourceUrl: sourceUrl || undefined,
      contactPhone: contactPhone || undefined,
      eventDate: type === "event" ? eventDate : undefined,
      eventEndDate:
        type === "event" && eventEndDate ? eventEndDate : undefined,
    };

    const entry = await createPendingEntry(input);
    return NextResponse.json({ success: true, id: entry.id });
  } catch (error) {
    console.error("Failed to create entry:", error);
    return NextResponse.json(
      { error: "Failed to submit entry" },
      { status: 500 }
    );
  }
}
