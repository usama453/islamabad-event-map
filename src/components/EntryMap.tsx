"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Entry } from "@/lib/types";
import {
  CATEGORY_LABELS,
  MAP_PIN_COLORS,
  ISLAMABAD_CENTER,
  DEFAULT_ZOOM,
} from "@/lib/constants";
import {
  formatEventSchedule,
  happeningSoonLabel,
  hasCoordinates,
  isEventHappeningSoon,
  mapPinPosition,
  truncate,
} from "@/lib/utils";
import { FloatingSprites, KohCompanion } from "@/components/KohMascot";
import { MapPopupCard } from "@/components/MapPopupCard";
import { ViewerTicker } from "@/components/ViewerTicker";
import { useTheme } from "@/components/ThemeProvider";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface EntryMapProps {
  entries: Entry[];
  selectedId: string | null;
  onSelect: (entry: Entry | null) => void;
  flyToEntry?: Entry | null;
  /** When true, map clicks drop a draft pin for the suggest form */
  pinMode?: boolean;
  draftPin?: { lat: number; lng: number } | null;
  onDraftPinChange?: (lat: number, lng: number) => void;
  onCancelPinMode?: () => void;
  onSuggest?: () => void;
  /** Open suggest form with a pin already dropped at these coords */
  onSuggestAt?: (lat: number, lng: number) => void;
  /** Start one-by-one pin drop after splash */
  animatePins?: boolean;
}

function EventPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
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

function PlacePinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
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

function PinTooltip({ entry }: { entry: Entry }) {
  const isEvent = entry.type === "event";
  const isPending = entry.status === "pending";
  const schedule = formatEventSchedule(entry);
  const location =
    entry.locationText?.trim() ||
    (hasCoordinates(entry) ? "Islamabad" : "Location TBD");
  const meta = isEvent ? schedule ?? "Date TBA" : "Open regularly";
  const soonLabel = isEvent ? happeningSoonLabel(entry) : null;

  return (
    <div className="pin-tooltip pointer-events-none w-[200px] rounded-xl border border-line bg-surface px-3 py-2.5 shadow-lg">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-white ${
            isPending
              ? "bg-[var(--pending)]"
              : isEvent
                ? "bg-[var(--orange)]"
                : "bg-[var(--blue)]"
          }`}
        >
          {isEvent ? (
            <EventPinIcon className="h-2.5 w-2.5" />
          ) : (
            <PlacePinIcon className="h-2.5 w-2.5" />
          )}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${
            isPending
              ? "text-[var(--pending)]"
              : isEvent
                ? "text-[var(--orange)]"
                : "text-[var(--blue)]"
          }`}
        >
          {isEvent ? "Event" : "Place"}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          {CATEGORY_LABELS[entry.category]}
        </span>
        {isPending && <span className="pending-badge">Pending</span>}
        {soonLabel && (
          <span className="soon-badge">
            <span className="soon-badge-dot" aria-hidden />
            {soonLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-ink">
        {truncate(entry.title, 48)}
      </p>
      <p
        className={`mt-1 truncate text-[11px] font-medium ${
          isPending
            ? "text-[var(--pending-deep)]"
            : isEvent
              ? "entry-meta-event"
              : "entry-meta-place"
        }`}
      >
        {meta}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-ink-muted">{location}</p>
    </div>
  );
}

function MapPin({
  entry,
  isSelected,
  showTooltip,
  onHoverChange,
  enter,
}: {
  entry: Entry;
  isSelected: boolean;
  showTooltip: boolean;
  onHoverChange: (hovering: boolean) => void;
  enter?: boolean;
}) {
  const isEvent = entry.type === "event";
  const isPending = entry.status === "pending";
  const color = isPending ? MAP_PIN_COLORS.pending : MAP_PIN_COLORS[entry.type];
  const soon = isEvent && !isPending && isEventHappeningSoon(entry);
  const soonLabel = soon ? happeningSoonLabel(entry) : null;

  return (
    <div
      className={`relative ${enter ? "map-pin-enter" : ""}`}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      {showTooltip && (
        <div className="absolute bottom-[calc(100%+10px)] left-1/2 z-20 -translate-x-1/2">
          <PinTooltip entry={entry} />
        </div>
      )}
      <button
        type="button"
        aria-label={`${isPending ? "Pending " : ""}${
          isEvent ? "Event" : "Place"
        }: ${entry.title}${soonLabel ? ` — ${soonLabel}` : ""}${
          isPending ? " — awaiting review" : ""
        }`}
        className={`relative flex h-7 w-7 items-center justify-center rounded-full border-0 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform dark:shadow-[0_2px_10px_rgba(0,0,0,0.55)] ${
          isPending ? "pin-pending" : isEvent ? "pin-event" : ""
        } ${isSelected ? "scale-125" : "hover:scale-110"} ${
          isPending ? "ring-2 ring-dashed ring-white/80" : ""
        }`}
        style={
          isPending || isEvent ? undefined : { backgroundColor: color }
        }
      >
        {soon && <span className="pin-soon-ring" aria-hidden />}
        {isEvent ? (
          <EventPinIcon className="h-3.5 w-3.5" />
        ) : (
          <PlacePinIcon className="h-3.5 w-3.5" />
        )}
        <span
          className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent"
          style={{ borderTopColor: color }}
          aria-hidden
        />
      </button>
    </div>
  );
}

export function EntryMap({
  entries,
  selectedId,
  onSelect,
  flyToEntry,
  pinMode = false,
  draftPin = null,
  onDraftPinChange,
  onCancelPinMode,
  onSuggest,
  onSuggestAt,
  animatePins = false,
}: EntryMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { theme } = useTheme();
  const [popupEntry, setPopupEntry] = useState<Entry | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [suggestPrompt, setSuggestPrompt] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [visiblePinCount, setVisiblePinCount] = useState(0);
  const [enteringPinIds, setEnteringPinIds] = useState<Set<string>>(
    () => new Set()
  );
  const pinRevealDone = useRef(false);

  const mappableEntries = entries.filter(hasCoordinates);
  const mappableIdsKey = mappableEntries.map((e) => e.id).join("|");

  // Reveal pins one-by-one after splash + map ready
  useEffect(() => {
    if (!mapReady || !animatePins || pinMode || mappableEntries.length === 0)
      return;
    if (pinRevealDone.current) {
      // After intro, show any newly added pins immediately
      setVisiblePinCount(mappableEntries.length);
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setVisiblePinCount(mappableEntries.length);
      pinRevealDone.current = true;
      return;
    }

    const pins = mappableEntries;
    setVisiblePinCount(0);
    let i = 0;
    const stepMs = Math.max(
      55,
      Math.min(120, 2200 / Math.max(pins.length, 1))
    );
    const clearEnterTimers: number[] = [];

    const tick = () => {
      i += 1;
      const next = pins[i - 1];
      if (next) {
        setEnteringPinIds((prev) => new Set(prev).add(next.id));
        clearEnterTimers.push(
          window.setTimeout(() => {
            setEnteringPinIds((prev) => {
              const copy = new Set(prev);
              copy.delete(next.id);
              return copy;
            });
          }, 450)
        );
      }
      setVisiblePinCount(i);
      if (i >= pins.length) {
        pinRevealDone.current = true;
        return;
      }
      timer = window.setTimeout(tick, stepMs);
    };

    let timer = window.setTimeout(tick, 120);
    return () => {
      window.clearTimeout(timer);
      clearEnterTimers.forEach((id) => window.clearTimeout(id));
    };
    // mappableIdsKey tracks identity; length covered by that key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, animatePins, pinMode, mappableIdsKey]);

  useEffect(() => {
    if (pinMode) {
      setPopupEntry(null);
      setHoveredId(null);
      setSuggestPrompt(null);
    }
  }, [pinMode]);

  useEffect(() => {
    if (!onSuggestAt) setSuggestPrompt(null);
  }, [onSuggestAt]);

  useEffect(() => {
    if (flyToEntry && hasCoordinates(flyToEntry) && !pinMode) {
      mapRef.current?.flyTo({
        center: [flyToEntry.lng!, flyToEntry.lat!],
        zoom: 14,
        duration: 800,
      });
      setPopupEntry(flyToEntry);
      setHoveredId(null);
    }
  }, [flyToEntry, pinMode]);

  useEffect(() => {
    if (draftPin && pinMode) {
      mapRef.current?.flyTo({
        center: [draftPin.lng, draftPin.lat],
        zoom: Math.max(mapRef.current.getZoom(), 13),
        duration: 500,
      });
    }
  }, [draftPin, pinMode]);

  const handleMarkerClick = useCallback(
    (entry: Entry) => {
      if (pinMode) return;
      setSuggestPrompt(null);
      onSelect(entry);
      setPopupEntry(entry);
      setHoveredId(null);
    },
    [onSelect, pinMode]
  );

  const dismissSuggestPrompt = useCallback(() => {
    setSuggestPrompt(null);
  }, []);

  const confirmSuggestPrompt = useCallback(() => {
    if (!suggestPrompt || !onSuggestAt) return;
    const { lat, lng } = suggestPrompt;
    setSuggestPrompt(null);
    onSuggestAt(lat, lng);
  }, [suggestPrompt, onSuggestAt]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-wash p-6 text-center">
        <p className="text-sm text-ink-muted">
          Map unavailable — set{" "}
          <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your
          environment.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: ISLAMABAD_CENTER.lat,
          longitude: ISLAMABAD_CENTER.lng,
          zoom: DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={
          theme === "dark"
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/streets-v12"
        }
        cursor={pinMode ? "crosshair" : undefined}
        onLoad={() => setMapReady(true)}
        onClick={(e) => {
          if (pinMode && onDraftPinChange) {
            onDraftPinChange(e.lngLat.lat, e.lngLat.lng);
            return;
          }
          // Ignore clicks on UI controls / markers (markers stopPropagation)
          const target = e.originalEvent.target as HTMLElement | null;
          if (
            target?.closest?.(
              ".mapboxgl-ctrl, .mapboxgl-popup, button, a"
            )
          ) {
            return;
          }
          setPopupEntry(null);
          setHoveredId(null);
          onSelect(null);
          if (onSuggestAt) {
            setSuggestPrompt({
              lat: e.lngLat.lat,
              lng: e.lngLat.lng,
            });
          }
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {mappableEntries
          .slice(0, pinMode ? mappableEntries.length : visiblePinCount)
          .map((entry) => {
          const isSelected = !pinMode && selectedId === entry.id;
          const showTooltip =
            !pinMode &&
            hoveredId === entry.id &&
            popupEntry?.id !== entry.id;
          const position = mapPinPosition(entry, mappableEntries);
          const enter = !pinMode && enteringPinIds.has(entry.id);

          return (
            <Marker
              key={entry.id}
              latitude={position.lat}
              longitude={position.lng}
              anchor="bottom"
              style={{
                zIndex:
                  showTooltip || isSelected || enter
                    ? 30
                    : entry.type === "event"
                      ? 10
                      : 5,
                opacity: pinMode ? 0.22 : 1,
                // Explicitly clear filter — `undefined` can leave Mapbox markers dulled
                filter: pinMode
                  ? "grayscale(0.85) saturate(0.2)"
                  : "none",
                pointerEvents: pinMode ? "none" : "auto",
              }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(entry);
              }}
            >
              <div
                className={pinMode ? "pin-dulled" : undefined}
                style={
                  pinMode
                    ? undefined
                    : { opacity: 1, filter: "none" }
                }
              >
                <MapPin
                  entry={entry}
                  isSelected={isSelected}
                  showTooltip={showTooltip}
                  enter={enter}
                  onHoverChange={(hovering) =>
                    setHoveredId(hovering ? entry.id : null)
                  }
                />
              </div>
            </Marker>
          );
        })}

        {pinMode && draftPin && (
          <Marker
            latitude={draftPin.lat}
            longitude={draftPin.lng}
            anchor="bottom"
            style={{ zIndex: 40 }}
          >
            <div className="relative flex flex-col items-center">
              <span className="mb-1 rounded-full bg-[var(--blue)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                Your pin
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--blue)] text-white shadow-[0_2px_10px_rgba(0,81,255,0.45)] ring-2 ring-white">
                <PlacePinIcon className="h-4 w-4" />
              </span>
              <span
                className="h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent"
                style={{ borderTopColor: MAP_PIN_COLORS.place }}
                aria-hidden
              />
            </div>
          </Marker>
        )}

        {!pinMode && popupEntry && hasCoordinates(popupEntry) && (
          <Popup
            latitude={mapPinPosition(popupEntry, mappableEntries).lat}
            longitude={mapPinPosition(popupEntry, mappableEntries).lng}
            anchor="top"
            onClose={() => {
              setPopupEntry(null);
              onSelect(null);
            }}
            closeOnClick={false}
            closeButton={false}
            maxWidth="360px"
            offset={20}
            className="entry-map-popup"
          >
            <MapPopupCard
              entry={popupEntry}
              onClose={() => {
                setPopupEntry(null);
                onSelect(null);
              }}
            />
          </Popup>
        )}

        {!pinMode && suggestPrompt && onSuggestAt && (
          <>
            <Marker
              latitude={suggestPrompt.lat}
              longitude={suggestPrompt.lng}
              anchor="bottom"
              style={{ zIndex: 35 }}
            >
              <div className="relative flex flex-col items-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--blue)] text-white shadow-[0_2px_10px_rgba(0,81,255,0.4)] ring-2 ring-white">
                  <PlacePinIcon className="h-3.5 w-3.5" />
                </span>
                <span
                  className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent"
                  style={{ borderTopColor: MAP_PIN_COLORS.place }}
                  aria-hidden
                />
              </div>
            </Marker>
            <Popup
              latitude={suggestPrompt.lat}
              longitude={suggestPrompt.lng}
              anchor="bottom"
              onClose={dismissSuggestPrompt}
              closeOnClick={false}
              closeButton={false}
              maxWidth="280px"
              offset={36}
              className="entry-map-popup"
            >
              <div
                className="w-[240px] rounded-xl border border-line bg-surface p-3 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-semibold leading-snug text-ink">
                  Would you like to add a spot or create an event here?
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={confirmSuggestPrompt}
                    className="btn-primary flex-1 rounded-full border px-3 py-2 text-xs font-semibold"
                  >
                    Yes, create
                  </button>
                  <button
                    type="button"
                    onClick={dismissSuggestPrompt}
                    className="rounded-full border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink transition hover:bg-wash"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Popup>
          </>
        )}
      </Map>

      {!pinMode && (
        <ViewerTicker className="absolute left-3 top-3 z-20" />
      )}

      {!pinMode && onSuggest && (
        <button
          type="button"
          onClick={onSuggest}
          className="btn-primary absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-lg sm:left-auto sm:right-14 sm:translate-x-0"
        >
          <span className="sm:hidden">Suggest</span>
          <span className="hidden sm:inline">Suggest an event/place</span>
        </button>
      )}

      {pinMode && (
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--orange)_45%,white)] bg-[var(--orange)] pl-4 pr-1.5 py-1.5 text-sm font-semibold text-white shadow-md">
          <span className="pointer-events-none whitespace-nowrap">
            Click the map to drop your pin
            {draftPin && (
              <span className="ml-2 font-medium text-white/85">
                · {draftPin.lat.toFixed(4)}, {draftPin.lng.toFixed(4)}
              </span>
            )}
          </span>
          {onCancelPinMode && (
            <button
              type="button"
              onClick={onCancelPinMode}
              aria-label="Cancel pin placement"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-base leading-none text-white transition hover:bg-white/30"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-4 right-3 z-10 flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm backdrop-blur-sm dark:bg-surface-raised/90">
        <span className="inline-flex items-center gap-1.5">
          <span className="pin-event inline-flex h-5 w-5 items-center justify-center rounded-full border-0 text-white">
            <EventPinIcon className="h-3 w-3" />
          </span>
          Events
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: MAP_PIN_COLORS.place }}
          >
            <PlacePinIcon className="h-3 w-3" />
          </span>
          Places
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="pin-pending inline-flex h-5 w-5 items-center justify-center rounded-full border-0 text-white ring-1 ring-dashed ring-white/70">
            <PlacePinIcon className="h-3 w-3" />
          </span>
          Pending
        </span>
      </div>

      {!pinMode && <FloatingSprites />}
      {!pinMode && <KohCompanion className="hidden sm:flex" />}
    </div>
  );
}
