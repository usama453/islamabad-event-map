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
  type Category,
} from "@/lib/constants";
import {
  entryOrganizerName,
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
import { CategoryIcon, categoryColor } from "@/components/CategoryIcon";

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
  /** Open suggest form with a pin already dropped at these coords */
  onSuggestAt?: (lat: number, lng: number) => void;
  /** Start one-by-one pin drop after splash */
  animatePins?: boolean;
  viewedIds?: Set<string>;
  focusedCategories?: Category[];
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
  const location = entry.locationText?.trim() || null;
  const soonLabel = isEvent ? happeningSoonLabel(entry) : null;
  const organizer = entryOrganizerName(entry);

  return (
    <div className="pin-tooltip pointer-events-none w-[200px] rounded-xl border border-line bg-surface px-3 py-2.5 shadow-lg">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-white ${
            isPending
              ? "bg-[var(--pending)]"
              : isEvent
                ? "bg-[var(--orange)]"
                : ""
          }`}
          style={
            !isPending && !isEvent
              ? { backgroundColor: categoryColor(entry.category) }
              : undefined
          }
        >
          {isEvent ? (
            <EventPinIcon className="h-2.5 w-2.5" />
          ) : (
            <CategoryIcon category={entry.category} className="h-2.5 w-2.5" />
          )}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${
            isPending
              ? "text-[var(--pending)]"
              : isEvent
                ? "text-[var(--orange)]"
                : ""
          }`}
          style={
            !isPending && !isEvent
              ? { color: categoryColor(entry.category) }
              : undefined
          }
        >
          {isEvent ? "Event" : CATEGORY_LABELS[entry.category]}
        </span>
        {isEvent && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {CATEGORY_LABELS[entry.category]}
          </span>
        )}
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
      {organizer && (
        <p className="mt-0.5 truncate text-[11px] text-ink-muted">
          by {organizer}
        </p>
      )}
      {isEvent && (
        <p
          className={`mt-1 truncate text-[11px] font-medium ${
            isPending ? "text-[var(--pending-deep)]" : "entry-meta-event"
          }`}
        >
          {schedule ?? "Date TBA"}
        </p>
      )}
      {location &&
        !location.toLowerCase().includes("not finalised") &&
        location.toLowerCase() !== "islamabad" && (
          <p className="mt-0.5 truncate text-[11px] text-ink-muted">{location}</p>
        )}
    </div>
  );
}

function MapPin({
  entry,
  isSelected,
  isViewed,
  isDimmed,
  showTooltip,
  onHoverChange,
  enter,
}: {
  entry: Entry;
  isSelected: boolean;
  isViewed?: boolean;
  isDimmed?: boolean;
  showTooltip: boolean;
  onHoverChange: (hovering: boolean) => void;
  enter?: boolean;
}) {
  const isEvent = entry.type === "event";
  const isPending = entry.status === "pending";
  const color = isPending
    ? MAP_PIN_COLORS.pending
    : isEvent
      ? MAP_PIN_COLORS.event
      : categoryColor(entry.category);
  const soon = isEvent && !isPending && isEventHappeningSoon(entry);
  const soonLabel = soon ? happeningSoonLabel(entry) : null;
  const showViewed = Boolean(isViewed && !isSelected && !isDimmed);

  return (
    <div
      className={`relative ${enter ? "map-pin-enter" : ""} ${
        isDimmed && !isSelected
          ? "opacity-[0.22] saturate-[0.3]"
          : showViewed
            ? "opacity-55 saturate-[0.7]"
            : ""
      }`}
      style={{ zIndex: isSelected ? 3 : isDimmed ? 1 : 2 }}
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
          isEvent ? "Event" : CATEGORY_LABELS[entry.category]
        }: ${entry.title}${soonLabel ? ` — ${soonLabel}` : ""}${
          isPending ? " — awaiting review" : ""
        }${showViewed ? " — viewed" : ""}`}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border-0 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-transform dark:shadow-[0_2px_10px_rgba(0,0,0,0.55)] ${
          isPending ? "pin-pending" : isEvent ? "pin-event" : ""
        } ${isSelected ? "scale-125" : "hover:scale-110"} ${
          isPending ? "ring-2 ring-dashed ring-white/80" : ""
        }`}
        style={isPending || isEvent ? undefined : { backgroundColor: color }}
      >
        {soon && <span className="pin-soon-ring" aria-hidden />}
        {isEvent ? (
          <EventPinIcon className="h-3.5 w-3.5" />
        ) : (
          <CategoryIcon category={entry.category} className="h-4 w-4" />
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
  onSuggestAt,
  animatePins = false,
  viewedIds,
  focusedCategories = [],
}: EntryMapProps) {
  const mapRef = useRef<MapRef>(null);
  const { theme } = useTheme();
  const [popupEntry, setPopupEntry] = useState<Entry | null>(null);
  const [panelPos, setPanelPos] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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
  const revealGen = useRef(0);
  const shellRef = useRef<HTMLDivElement>(null);

  const mappableEntries = entries.filter(hasCoordinates);
  const mappableIdsKey = mappableEntries.map((e) => e.id).join("|");
  const mappableRef = useRef(mappableEntries);
  mappableRef.current = mappableEntries;

  // Keep Mapbox in sync when the mobile expand/collapse changes the shell size
  useEffect(() => {
    if (!mapReady) return;
    const shell = shellRef.current;
    const map = mapRef.current?.getMap();
    if (!shell || !map) return;

    const resize = () => map.resize();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(shell);
    return () => ro.disconnect();
  }, [mapReady]);

  // Drop every pin in one-by-one whenever the visible set changes
  // (page load, All / Events / Places, category filters, etc.)
  useEffect(() => {
    if (!mapReady || !animatePins || pinMode) return;

    if (mappableEntries.length === 0) {
      setVisiblePinCount(0);
      setEnteringPinIds(new Set());
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setVisiblePinCount(mappableEntries.length);
      setEnteringPinIds(new Set());
      return;
    }

    const pins = mappableEntries;
    const gen = ++revealGen.current;
    setVisiblePinCount(0);
    setEnteringPinIds(new Set());

    let i = 0;
    const stepMs = Math.max(
      40,
      Math.min(90, 1600 / Math.max(pins.length, 1))
    );
    const clearEnterTimers: number[] = [];
    let timer = 0;

    const tick = () => {
      if (gen !== revealGen.current) return;
      i += 1;
      const next = pins[i - 1];
      if (next) {
        setEnteringPinIds((prev) => new Set(prev).add(next.id));
        clearEnterTimers.push(
          window.setTimeout(() => {
            if (gen !== revealGen.current) return;
            setEnteringPinIds((prev) => {
              const copy = new Set(prev);
              copy.delete(next.id);
              return copy;
            });
          }, 420)
        );
      }
      setVisiblePinCount(i);
      if (i >= pins.length) return;
      timer = window.setTimeout(tick, stepMs);
    };

    timer = window.setTimeout(tick, 60);
    return () => {
      revealGen.current += 1; // invalidate in-flight reveal
      window.clearTimeout(timer);
      clearEnterTimers.forEach((id) => window.clearTimeout(id));
    };
    // mappableIdsKey tracks the full pin set identity
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

  const focusPinNearCard = useCallback(
    (entry: Entry) => {
      if (!hasCoordinates(entry) || pinMode) return;
      const map = mapRef.current?.getMap();
      const w = map?.getContainer().clientWidth ?? 600;
      const h = map?.getContainer().clientHeight ?? 400;
      const mobile = window.matchMedia("(max-width: 1023px)").matches;

      if (mobile) {
        // Keep pin in the clear band above the bottom sheet
        const bottomPad = Math.round(
          Math.min(Math.max(h * 0.52, 220), h * 0.62)
        );
        mapRef.current?.flyTo({
          center: [entry.lng!, entry.lat!],
          zoom: Math.max(mapRef.current.getZoom() ?? DEFAULT_ZOOM, 13.5),
          duration: 700,
          padding: { top: 40, bottom: bottomPad, left: 28, right: 28 },
          essential: true,
        });
        return;
      }

      // Desktop: leave a pocket to the right of the pin for the detail card
      const rightPad = Math.round(Math.min(Math.max(w * 0.28, 180), 300));
      mapRef.current?.flyTo({
        center: [entry.lng!, entry.lat!],
        zoom: Math.max(mapRef.current.getZoom() ?? DEFAULT_ZOOM, 13.5),
        duration: 700,
        padding: { top: 56, bottom: 56, left: 48, right: rightPad },
        essential: true,
      });
    },
    [pinMode]
  );

  const updatePanelPos = useCallback(() => {
    if (!popupEntry || !hasCoordinates(popupEntry)) {
      setPanelPos(null);
      return;
    }
    const map = mapRef.current?.getMap();
    const shell = shellRef.current;
    if (!map || !shell) return;

    const shellW = shell.clientWidth;
    const shellH = shell.clientHeight;
    const margin = 12;
    const mobile = window.matchMedia("(max-width: 1023px)").matches;

    if (mobile) {
      // Bottom-centered sheet with a hard height cap (dvh/% fail when parent height is auto)
      const width = Math.min(340, shellW - 24);
      const left = Math.round((shellW - width) / 2);
      const maxHeight = Math.min(360, Math.round(shellH * 0.42));
      const bottom = 88; // clear of browse arrows
      const next = { left, bottom, width, maxHeight };
      setPanelPos((prev) =>
        prev &&
        prev.left === next.left &&
        prev.bottom === next.bottom &&
        prev.width === next.width &&
        prev.maxHeight === next.maxHeight
          ? prev
          : next
      );
      return;
    }

    const pin = mapPinPosition(popupEntry, mappableRef.current);
    const pt = map.project([pin.lng, pin.lat]);
    const width = Math.min(340, Math.max(260, shellW - 24));
    const gap = 28;

    // Prefer just to the right of the pin; flip left if it would clip
    let left = pt.x + gap;
    if (left + width > shellW - margin) {
      left = pt.x - gap - width;
    }
    left = Math.max(margin, Math.min(left, shellW - width - margin));

    const maxHeight = Math.min(460, Math.round(shellH * 0.85));
    const cardH = Math.min(
      panelRef.current?.offsetHeight || 360,
      maxHeight
    );
    let top = pt.y - cardH / 2;
    top = Math.max(margin, Math.min(top, shellH - cardH - margin));

    const next = {
      left: Math.round(left),
      top: Math.round(top),
      width,
      maxHeight,
    };
    setPanelPos((prev) =>
      prev &&
      prev.left === next.left &&
      prev.top === next.top &&
      prev.width === next.width &&
      prev.maxHeight === next.maxHeight
        ? prev
        : next
    );
  }, [popupEntry]);

  useEffect(() => {
    if (!popupEntry || !mapReady || pinMode) {
      setPanelPos(null);
      return;
    }
    updatePanelPos();
    const raf = window.requestAnimationFrame(() => updatePanelPos());
    const map = mapRef.current?.getMap();
    if (!map) {
      return () => window.cancelAnimationFrame(raf);
    }
    map.on("move", updatePanelPos);
    map.on("zoom", updatePanelPos);
    map.on("resize", updatePanelPos);
    return () => {
      window.cancelAnimationFrame(raf);
      map.off("move", updatePanelPos);
      map.off("zoom", updatePanelPos);
      map.off("resize", updatePanelPos);
    };
  }, [popupEntry, mapReady, pinMode, updatePanelPos]);

  useEffect(() => {
    if (flyToEntry && hasCoordinates(flyToEntry) && !pinMode) {
      setPopupEntry(flyToEntry);
      setHoveredId(null);
      focusPinNearCard(flyToEntry);
    }
  }, [flyToEntry, pinMode, focusPinNearCard]);

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
      focusPinNearCard(entry);
    },
    [onSelect, pinMode, focusPinNearCard]
  );

  const browseIndex = popupEntry
    ? mappableEntries.findIndex((e) => e.id === popupEntry.id)
    : -1;

  const browseTo = useCallback(
    (delta: number) => {
      if (pinMode || browseIndex < 0 || mappableEntries.length < 2) return;
      const nextIndex =
        (browseIndex + delta + mappableEntries.length) % mappableEntries.length;
      const next = mappableEntries[nextIndex];
      if (!next) return;
      setSuggestPrompt(null);
      setPopupEntry(next);
      onSelect(next);
      setHoveredId(null);
      focusPinNearCard(next);
    },
    [
      pinMode,
      browseIndex,
      mappableEntries,
      onSelect,
      focusPinNearCard,
    ]
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
    <div ref={shellRef} className="relative h-full w-full">
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
                  isViewed={viewedIds?.has(entry.id)}
                  isDimmed={
                    focusedCategories.length > 0 &&
                    !focusedCategories.includes(entry.category)
                  }
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

      {/* Detail card anchored next to the selected pin (screen-space) */}
      {!pinMode && popupEntry && panelPos && (
        <>
          {mappableEntries.length > 1 && (
            <>
              {/* Mobile: bottom-center pair */}
              <div className="pointer-events-auto absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => browseTo(-1)}
                  aria-label="Previous spot"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-2xl leading-none text-ink shadow-md transition hover:bg-wash"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => browseTo(1)}
                  aria-label="Next spot"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-2xl leading-none text-ink shadow-md transition hover:bg-wash"
                >
                  ›
                </button>
              </div>
              {/* Desktop: left / right edges */}
              <button
                type="button"
                onClick={() => browseTo(-1)}
                aria-label="Previous spot"
                className="pointer-events-auto absolute left-3 top-1/2 z-50 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-2xl leading-none text-ink shadow-md transition hover:bg-wash lg:flex"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => browseTo(1)}
                aria-label="Next spot"
                className="pointer-events-auto absolute right-3 top-1/2 z-50 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-2xl leading-none text-ink shadow-md transition hover:bg-wash lg:flex"
              >
                ›
              </button>
            </>
          )}
          <div
            className="pointer-events-none absolute z-40"
            style={
              panelPos.bottom != null
                ? {
                    left: panelPos.left,
                    bottom: panelPos.bottom,
                    width: panelPos.width,
                  }
                : {
                    left: panelPos.left,
                    top: panelPos.top,
                    width: panelPos.width,
                  }
            }
          >
            <div
              ref={panelRef}
              className="map-detail-panel pointer-events-auto overflow-y-auto overflow-x-hidden hide-scrollbar rounded-2xl border border-line bg-surface shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
              style={{ maxHeight: panelPos.maxHeight }}
              onClick={(e) => e.stopPropagation()}
            >
              <MapPopupCard
                entry={popupEntry}
                onClose={() => {
                  setPopupEntry(null);
                  onSelect(null);
                }}
                onPrev={() => browseTo(-1)}
                onNext={() => browseTo(1)}
                browseIndex={browseIndex >= 0 ? browseIndex : undefined}
                browseTotal={mappableEntries.length}
              />
            </div>
          </div>
        </>
      )}

      {!pinMode && (
        <ViewerTicker className="absolute left-2 top-[4.5rem] z-20 sm:left-3 lg:top-3" />
      )}

      {pinMode && (
        <div className="absolute left-1/2 top-[4.25rem] z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--orange)_45%,white)] bg-[var(--orange)] pl-4 pr-1.5 py-1.5 text-sm font-semibold text-white shadow-md sm:top-3">
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

      {!pinMode && <FloatingSprites />}
      {!pinMode && <KohCompanion className="hidden sm:flex" />}
    </div>
  );
}
