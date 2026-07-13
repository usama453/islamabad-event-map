"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EntryList } from "@/components/EntryList";
import { Header } from "@/components/Header";
import { CategoryStrip } from "@/components/CategoryStrip";
import { SubmitForm } from "@/components/SubmitForm";
import { AppSplash, QuietLoader } from "@/components/LoadingScreen";
import {
  hasSeenInterests,
  InterestsModal,
  loadSavedInterests,
  saveInterests,
} from "@/components/InterestsModal";
import type { Category, DateFilter, ViewFilter } from "@/lib/constants";
import { CATEGORIES } from "@/lib/constants";
import type { Entry } from "@/lib/types";
import { matchesDateFilter, sortEntries } from "@/lib/utils";
import {
  loadViewedEntryIds,
  markEntryViewed,
} from "@/lib/viewedEntries";

const EntryMap = dynamic(
  () => import("@/components/EntryMap").then((m) => m.EntryMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[var(--map-panel)]">
        <QuietLoader label="Loading map…" />
      </div>
    ),
  }
);

export function HomePage() {
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("place");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyToEntry, setFlyToEntry] = useState<Entry | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [exitPinModeSignal, setExitPinModeSignal] = useState(0);
  const [introReady, setIntroReady] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => new Set());
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(
    null
  );

  useEffect(() => {
    setViewedIds(loadViewedEntryIds());
    setSelectedCategories(loadSavedInterests());
  }, []);

  const loadEntries = useCallback(() => {
    setLoading(true);
    fetch("/api/entries")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load entries");
        return res.json();
      })
      .then((data) => setAllEntries(data.entries ?? []))
      .catch(() =>
        setError("Could not load entries. Check your Airtable configuration.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    const open = () => setShowSubmit(true);
    window.addEventListener("open-submit", open);
    return () => window.removeEventListener("open-submit", open);
  }, []);

  useEffect(() => {
    if (!showSubmit) {
      setPinMode(false);
      setDraftPin(null);
    } else {
      // Suggest form lives in the list pane — don't leave it behind an expanded map
      setMapExpanded(false);
    }
  }, [showSubmit]);

  const typeEntries = useMemo(() => {
    return allEntries.filter((e) => e.type === viewFilter);
  }, [allEntries, viewFilter]);

  const availableCategories = useMemo(() => {
    const used = new Set(typeEntries.map((e) => e.category));
    return CATEGORIES.filter((c) => used.has(c));
  }, [typeEntries]);

  const filteredEntries = useMemo(() => {
    let result = typeEntries;

    // Date filter applies to events only; places always pass
    if (viewFilter === "event") {
      result = result.filter((e) => matchesDateFilter(e, dateFilter));
    }

    const sorted = sortEntries(result, viewFilter);

    // Preferred interests float to the top; others stay visible (dulled in UI)
    if (selectedCategories.length === 0) return sorted;
    return [...sorted].sort((a, b) => {
      const aHit = selectedCategories.includes(a.category) ? 0 : 1;
      const bHit = selectedCategories.includes(b.category) ? 0 : 1;
      return aHit - bHit;
    });
  }, [typeEntries, viewFilter, dateFilter, selectedCategories]);

  /** Map shows the full Events/Spots set; category focus only dulls pins */
  const mapEntries = useMemo(() => filteredEntries, [filteredEntries]);

  const handleSelect = useCallback((entry: Entry | null) => {
    setSelectedId(entry?.id ?? null);
    if (entry) {
      setFlyToEntry(entry);
      setViewedIds(markEntryViewed(entry.id));
    }
  }, []);

  const handleListSelect = useCallback((entry: Entry) => {
    setSelectedId(entry.id);
    setFlyToEntry({ ...entry });
    setViewedIds(markEntryViewed(entry.id));
  }, []);

  const suggestDefault =
    viewFilter === "place" ? "place" : "event";

  const openSuggest = useCallback(() => setShowSubmit(true), []);

  const openSuggestAt = useCallback((lat: number, lng: number) => {
    setDraftPin({ lat, lng });
    setPinMode(true);
    setShowSubmit(true);
  }, []);

  const handleIntroDone = useCallback(() => setIntroReady(true), []);

  // Map + pins first; sidebar arrives after a beat
  useEffect(() => {
    if (!introReady) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const delay = reduceMotion ? 0 : 3000;
    const t = window.setTimeout(() => setSidebarReady(true), delay);
    return () => window.clearTimeout(t);
  }, [introReady]);

  const handleCategoriesChange = useCallback((categories: Category[]) => {
    setSelectedCategories(categories);
    saveInterests(categories);
  }, []);

  const handleInterestsContinue = useCallback((categories: Category[]) => {
    setSelectedCategories(categories);
    setShowInterests(false);
  }, []);

  // Interests modal after the sidebar has arrived
  useEffect(() => {
    if (!sidebarReady || loading) return;
    if (hasSeenInterests()) return;
    const t = window.setTimeout(() => setShowInterests(true), 500);
    return () => window.clearTimeout(t);
  }, [sidebarReady, loading]);

  // Never leave the splash waiting forever if the fetch hangs
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setLoading(false), 10000);
    return () => window.clearTimeout(t);
  }, [loading]);

  const spotSelected = Boolean(selectedId) && !showSubmit && !mapExpanded;

  return (
    <AppSplash ready={!loading} onIntroDone={handleIntroDone}>
      <InterestsModal
        open={showInterests}
        onContinue={handleInterestsContinue}
      />
      <div className="flex h-dvh flex-col lg:flex-row">
      {/* Brand bar — top of screen on mobile; inside sidebar on desktop */}
      {sidebarReady && (
        <div className="order-0 shrink-0 bg-surface lg:hidden">
          <Header
            variant="sidebar"
            listingCount={filteredEntries.length}
            viewFilter={viewFilter}
          />
        </div>
      )}

      {/* Map: full-bleed while pins drop in, then shares space with sidebar */}
      <aside
        className={`relative order-1 shrink-0 border-b border-line transition-[height,flex-grow,max-height] duration-500 ease-out lg:order-2 lg:h-full lg:min-w-0 lg:flex-1 lg:border-b-0 lg:border-l ${
          mapExpanded || !sidebarReady
            ? "min-h-0 flex-1 border-b-0 max-h-none lg:h-full"
            : spotSelected
              ? "min-h-0 flex-1 max-h-none lg:max-h-none"
              : "h-[46%] min-h-[260px] max-h-[52%] lg:h-full lg:max-h-none"
        }`}
      >
        <div className="absolute inset-0">
          <EntryMap
            entries={mapEntries}
            selectedId={selectedId}
            onSelect={handleSelect}
            flyToEntry={flyToEntry}
            pinMode={showSubmit && pinMode}
            draftPin={draftPin}
            onDraftPinChange={(lat, lng) => setDraftPin({ lat, lng })}
            onCancelPinMode={() => {
              setPinMode(false);
              setExitPinModeSignal((n) => n + 1);
            }}
            onSuggestAt={!showSubmit ? openSuggestAt : undefined}
            animatePins={introReady}
            viewedIds={viewedIds}
            focusedCategories={selectedCategories}
          />
        </div>
        {sidebarReady && (
          <button
            type="button"
            onClick={() => setMapExpanded((v) => !v)}
            aria-expanded={mapExpanded}
            aria-label={mapExpanded ? "Collapse map" : "Expand map"}
            className="absolute bottom-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:bg-wash lg:hidden"
          >
            {mapExpanded ? (
              <>
                <CollapseMapIcon />
                Show list
              </>
            ) : (
              <>
                <ExpandMapIcon />
                Expand map
              </>
            )}
          </button>
        )}
      </aside>

      {/* List: slides in after the pin intro */}
      <section
        className={`relative order-2 min-w-0 flex-col overflow-hidden bg-surface transition-all duration-500 ease-out lg:order-1 ${
          !sidebarReady
            ? "pointer-events-none max-h-0 flex-none translate-y-6 opacity-0 lg:w-0 lg:max-w-0 lg:translate-x-[-16px] lg:translate-y-0 lg:border-0 lg:opacity-0"
            : mapExpanded
              ? "hidden lg:flex lg:h-full lg:w-[32%] lg:max-w-[420px] lg:flex-none lg:translate-x-0 lg:opacity-100"
              : spotSelected
                ? "flex min-h-0 max-h-[18vh] flex-none translate-y-0 opacity-100 lg:h-full lg:max-h-none lg:w-[32%] lg:max-w-[420px] lg:flex-none lg:translate-x-0"
                : "flex min-h-0 flex-1 translate-y-0 opacity-100 lg:h-full lg:w-[32%] lg:max-w-[420px] lg:flex-none lg:translate-x-0"
        }`}
      >
        <div className="hidden lg:block">
          <Header
            variant="sidebar"
            listingCount={filteredEntries.length}
            viewFilter={viewFilter}
          />
        </div>

        {showSubmit ? (
          <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
            <div className="mb-2 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink sm:text-base">
                  {viewFilter === "event" ? "Add an event" : "Add a spot"}
                </h2>
                <p className="mt-0.5 text-xs text-ink-muted sm:text-sm">
                  {viewFilter === "event"
                    ? "Share a gig, market, meetup, or anything worth showing up for. It stays pending until verified."
                    : "Share a café, trail, hangout, or hidden gem. It stays pending until verified."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPinMode(false);
                  setDraftPin(null);
                  setShowSubmit(false);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line-strong bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-sm transition hover:border-ink-faint hover:bg-wash sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                <span aria-hidden className="text-base leading-none">
                  ×
                </span>
                Close
              </button>
            </div>
            <div className="rounded-xl border border-line bg-wash p-3 sm:p-5">
              <SubmitForm
                compact
                defaultType={suggestDefault}
                lockType
                lat={draftPin?.lat}
                lng={draftPin?.lng}
                exitPinModeSignal={exitPinModeSignal}
                onLocationChange={(lat, lng) => {
                  if (lat == null || lng == null) {
                    setDraftPin(null);
                  } else {
                    setDraftPin({ lat, lng });
                  }
                }}
                onPinModeChange={setPinMode}
                onSuccess={() => {
                  setDraftPin(null);
                  setPinMode(false);
                  loadEntries();
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <CategoryStrip
              categories={availableCategories}
              selected={selectedCategories}
              onChange={handleCategoriesChange}
            />
            <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-4 sm:py-4">
              {error ? (
                <div className="rounded-xl bg-danger-soft px-3 py-4 text-center sm:px-4 sm:py-6">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              ) : (
                <EntryList
                  entries={filteredEntries}
                  selectedId={selectedId}
                  onSelect={handleListSelect}
                  loading={loading}
                  viewFilter={viewFilter}
                  animateIn={sidebarReady}
                  viewedIds={viewedIds}
                  focusedCategories={selectedCategories}
                  onAdd={openSuggest}
                />
              )}
            </div>
          </>
        )}
      </section>
      </div>
    </AppSplash>
  );
}

function ExpandMapIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseMapIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
