"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Category,
  type EntryType,
} from "@/lib/constants";

type LocationMode = "map" | "text" | "tbd";

const fieldClass =
  "w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-[var(--ring)]";
const labelClass = "mb-1.5 block text-xs font-semibold text-ink";
const segment =
  "inline-flex flex-wrap rounded-full border border-line-strong p-0.5";
const segBtn = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
    active ? "seg-tab-active" : "seg-tab"
  }`;

interface SubmitFormProps {
  onSuccess?: () => void;
  defaultType?: EntryType;
  compact?: boolean;
  /** Controlled pin from the main map (when provided) */
  lat?: number;
  lng?: number;
  onLocationChange?: (lat: number | undefined, lng: number | undefined) => void;
  onPinModeChange?: (active: boolean) => void;
  /** Increment to leave pin-on-map mode (e.g. map pill ×) */
  exitPinModeSignal?: number;
}

export function SubmitForm({
  onSuccess,
  defaultType = "event",
  compact = false,
  lat: controlledLat,
  lng: controlledLng,
  onLocationChange,
  onPinModeChange,
  exitPinModeSignal = 0,
}: SubmitFormProps) {
  const [type, setType] = useState<EntryType>(defaultType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [locationMode, setLocationMode] = useState<LocationMode>("map");
  const [internalLat, setInternalLat] = useState<number | undefined>();
  const [internalLng, setInternalLng] = useState<number | undefined>();
  const [locationText, setLocationText] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const usesMainMap = Boolean(onLocationChange);
  const lat = usesMainMap ? controlledLat : internalLat;
  const lng = usesMainMap ? controlledLng : internalLng;

  const setCoords = (newLat: number | undefined, newLng: number | undefined) => {
    if (usesMainMap) {
      onLocationChange?.(newLat, newLng);
    } else {
      setInternalLat(newLat);
      setInternalLng(newLng);
    }
  };

  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  useEffect(() => {
    if (type === "place" && locationMode === "tbd") {
      setLocationMode("map");
    }
  }, [type, locationMode]);

  useEffect(() => {
    const active = locationMode === "map";
    onPinModeChange?.(active);
    return () => {
      onPinModeChange?.(false);
    };
    // Intentionally only re-run when location mode changes — parent setter is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationMode]);

  useEffect(() => {
    if (exitPinModeSignal > 0 && locationMode === "map") {
      setLocationMode("text");
    }
    // Only react to the signal itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exitPinModeSignal]);

  const handleTypeChange = (next: EntryType) => {
    setType(next);
    if (next === "place" && locationMode === "tbd") {
      setLocationMode("map");
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setTitle("");
    setDescription("");
    setCategory("");
    setCoords(undefined, undefined);
    setLocationText("");
    setLocationMode("map");
    setEventDate("");
    setEventEndDate("");
    setSourceUrl("");
    setContactPhone("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!category) {
      setError("Category is required");
      return;
    }
    if (type === "place") {
      if (locationMode === "map" && (lat == null || lng == null)) {
        setError("Places need a location — pin the map or describe the area");
        return;
      }
      if (locationMode === "text" && !locationText.trim()) {
        setError("Places need a location — describe where it is");
        return;
      }
    }
    if (type === "event") {
      if (locationMode === "map" && (lat == null || lng == null)) {
        setError("Pin a location, describe an area, or mark it as not finalised");
        return;
      }
      if (locationMode === "text" && !locationText.trim()) {
        setError("Describe the location, or choose “Not finalised yet”");
        return;
      }
      if (!eventDate) {
        setError("Event date is required");
        return;
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          lat: locationMode === "map" ? lat : undefined,
          lng: locationMode === "map" ? lng : undefined,
          locationText:
            locationMode === "text"
              ? locationText.trim()
              : locationMode === "tbd"
                ? "Location not finalised yet"
                : locationMode === "map" && locationText.trim()
                  ? locationText.trim()
                  : undefined,
          locationTbd: locationMode === "tbd",
          eventDate: type === "event" ? eventDate : undefined,
          eventEndDate:
            type === "event" && eventEndDate ? eventEndDate : undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          website: honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Submission failed");
        return;
      }

      setSuccess(true);
      onSuccess?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="border border-line bg-wash px-4 py-6 text-center">
        <h2 className="font-display text-lg font-medium text-ink">
          Submitted for review
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          It&apos;s on the map now in amber as pending — an admin will verify it.
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="mt-5 text-sm font-medium text-ink underline underline-offset-4"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={compact ? "space-y-4" : "space-y-5"}
    >
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <fieldset>
        <legend className={labelClass}>Type</legend>
        <div className={segment}>
          <button
            type="button"
            onClick={() => handleTypeChange("event")}
            className={segBtn(type === "event")}
          >
            Event
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("place")}
            className={segBtn(type === "place")}
          >
            Place
          </button>
        </div>
      </fieldset>

      <div>
        <label htmlFor="title" className={labelClass}>
          Title *
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={fieldClass}
          placeholder="e.g. Jazz Night at PNCA"
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          rows={compact ? 2 : 3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={fieldClass}
          placeholder="What should people know?"
        />
      </div>

      <div>
        <label htmlFor="category" className={labelClass}>
          Category *
        </label>
        <select
          id="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className={fieldClass}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={labelClass}>
          Location {type === "place" ? "*" : ""}
        </legend>

        {type === "place" && (
          <p className="mb-2 text-xs text-ink-muted">
            Places need a location so people can find them.
          </p>
        )}

        <div className={`mb-3 ${segment}`}>
          <button
            type="button"
            onClick={() => setLocationMode("map")}
            className={segBtn(locationMode === "map")}
          >
            Pin on map
          </button>
          <button
            type="button"
            onClick={() => setLocationMode("text")}
            className={segBtn(locationMode === "text")}
          >
            {type === "place" ? "Describe area" : "Approximate"}
          </button>
          {type === "event" && (
            <button
              type="button"
              onClick={() => setLocationMode("tbd")}
              className={segBtn(locationMode === "tbd")}
            >
              Not finalised
            </button>
          )}
        </div>

        {locationMode === "map" && (
          <div className="space-y-3 rounded-xl border border-[color-mix(in_srgb,var(--blue)_28%,transparent)] bg-[var(--blue-soft)] px-3 py-3">
            {usesMainMap ? (
              <>
                <p className="text-sm font-semibold text-ink">
                  Click the big map to drop a pin
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  Existing pins fade while you place yours. Click again to move it.
                </p>
              </>
            ) : (
              <p className="text-xs text-ink-muted">
                Pin mode needs the main map — open Suggest from the home page.
              </p>
            )}
            {lat != null && lng != null ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-medium text-[var(--blue)]">
                  Pinned · {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
                <button
                  type="button"
                  onClick={() => setCoords(undefined, undefined)}
                  className="text-[12px] font-semibold text-ink-muted underline-offset-2 hover:text-ink hover:underline"
                >
                  Clear pin
                </button>
              </div>
            ) : (
              <p className="text-[12px] text-ink-faint">No pin yet</p>
            )}

            <div>
              <label htmlFor="pinAddress" className="mb-1.5 block text-xs font-semibold text-ink">
                Address{" "}
                <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="pinAddress"
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className={fieldClass}
                placeholder='e.g. "F-7 Markaz, near Super Market"'
              />
            </div>
          </div>
        )}

        {locationMode === "text" && (
          <input
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className={fieldClass}
            placeholder={
              type === "place"
                ? 'e.g. "F-7 Markaz, near Super Market"'
                : 'e.g. "Somewhere in F-7"'
            }
            required={type === "place"}
          />
        )}

        {locationMode === "tbd" && type === "event" && (
          <p className="border border-line bg-wash px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
            Will show as location not finalised. Update later in Airtable when
            the venue is confirmed.
          </p>
        )}
      </fieldset>

      {type === "event" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="eventDate" className={labelClass}>
              Event date *
            </label>
            <input
              id="eventDate"
              type="date"
              required
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="eventEndDate" className={labelClass}>
              End date
            </label>
            <input
              id="eventEndDate"
              type="date"
              value={eventEndDate}
              min={eventDate || undefined}
              onChange={(e) => setEventEndDate(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="contactPhone" className={labelClass}>
          Contact number{" "}
          <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="contactPhone"
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className={fieldClass}
          placeholder="e.g. 0300 1234567"
          autoComplete="tel"
        />
      </div>

      <div>
        <label htmlFor="sourceUrl" className={labelClass}>
          Source URL{" "}
          <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="sourceUrl"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className={fieldClass}
          placeholder="https://…"
        />
      </div>

      {error && (
        <p className="border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full rounded-xl border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
