"use client";

import Image from "next/image";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Entry } from "@/lib/types";
import {
  formatEventSchedule,
  getEntryImage,
  happeningSoonLabel,
  hasCoordinates,
  isEventHappeningSoon,
} from "@/lib/utils";

interface EntryCardProps {
  entry: Entry;
  isSelected: boolean;
  onClick: () => void;
}

function EventIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3.5 10h17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 3.5v3.5M16 3.5v3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlaceIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-6.5-5.4-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.6 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.25" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function EntryCard({ entry, isSelected, onClick }: EntryCardProps) {
  const isEvent = entry.type === "event";
  const schedule = formatEventSchedule(entry);
  const coords = hasCoordinates(entry);
  const image = getEntryImage(entry);
  const locationTbd =
    !coords &&
    Boolean(entry.locationText?.toLowerCase().includes("not finalised"));

  const locationLine = locationTbd
    ? "Location TBD"
    : entry.locationText?.trim() ||
      (coords ? "Islamabad" : "No exact location");

  const typeLabel = isEvent ? "Event" : "Place";
  const metaLine = isEvent ? schedule ?? "Date TBA" : "Open regularly";
  const soon = isEvent && isEventHappeningSoon(entry);
  const soonLabel = soon ? happeningSoonLabel(entry) : null;
  const isPending = entry.status === "pending";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-start gap-3.5 rounded-xl border p-2 text-left transition ${
        isPending
          ? isSelected
            ? "entry-card-pending-selected border-transparent"
            : "entry-card-pending"
          : isSelected
            ? isEvent
              ? "entry-card-event-selected border-transparent"
              : "btn-primary btn-primary-selected border-transparent"
            : isEvent
              ? "entry-card-event"
              : "entry-card-place"
      }`}
    >
      <div className="relative h-[72px] w-[96px] shrink-0 overflow-hidden rounded-lg bg-line sm:h-[80px] sm:w-[108px]">
        <Image
          src={image}
          alt=""
          fill
          className={`object-cover transition duration-300 group-hover:scale-[1.03] ${
            isPending ? "opacity-85 saturate-[0.7]" : ""
          }`}
          sizes="108px"
        />
        <span
          className={`absolute left-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow-sm ${
            isPending
              ? "bg-[var(--pending)]"
              : isEvent
                ? "bg-[var(--orange)]"
                : "bg-[var(--blue)]"
          }`}
          aria-hidden
        >
          {isEvent ? (
            <EventIcon className="h-3.5 w-3.5" />
          ) : (
            <PlaceIcon className="h-3.5 w-3.5" />
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isSelected
                ? "bg-white/20 text-white"
                : isPending
                  ? "pending-badge"
                  : isEvent
                    ? "entry-type-event"
                    : "entry-type-place"
            }`}
          >
            {isEvent ? (
              <EventIcon className="h-3 w-3" />
            ) : (
              <PlaceIcon className="h-3 w-3" />
            )}
            {typeLabel}
          </span>
          <span
            className={`text-[11px] font-semibold uppercase tracking-wide ${
              isSelected ? "text-white/75" : "text-ink-muted"
            }`}
          >
            {CATEGORY_LABELS[entry.category]}
          </span>
          {isPending && (
            <span
              className={`pending-badge ${
                isSelected ? "pending-badge-on-dark" : ""
              }`}
            >
              Awaiting review
            </span>
          )}
          {soonLabel && (
            <span
              className={`soon-badge ${isSelected ? "soon-badge-on-dark" : ""}`}
            >
              <span className="soon-badge-dot" aria-hidden />
              {soonLabel}
            </span>
          )}
        </div>

        <h3
          className={`mt-1 line-clamp-2 text-[15px] font-semibold leading-snug ${
            isSelected ? "text-white" : "text-ink"
          }`}
        >
          {entry.title}
        </h3>

        <p
          className={`mt-1.5 flex items-center gap-1.5 truncate text-sm font-medium ${
            isSelected
              ? "text-white/90"
              : isPending
                ? "text-[var(--pending-deep)]"
                : isEvent
                  ? "entry-meta-event"
                  : "entry-meta-place"
          }`}
        >
          {isEvent ? (
            <EventIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
          ) : (
            <PlaceIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
          )}
          <span className="truncate">{metaLine}</span>
        </p>

        <p
          className={`mt-0.5 truncate text-sm ${
            isSelected ? "text-white/75" : "text-ink-muted"
          }`}
        >
          {locationLine}
        </p>

        {entry.sourceUrl && (
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`mt-1 inline-block text-sm font-medium underline-offset-2 hover:underline ${
              isSelected ? "text-white" : "text-ink"
            }`}
          >
            Source
          </a>
        )}
      </div>
    </button>
  );
}
