"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiltersBar } from "@/components/FiltersBar";
import { EntryList } from "@/components/EntryList";
import { Header } from "@/components/Header";
import { StayUpdated } from "@/components/StayUpdated";
import { SubmitForm } from "@/components/SubmitForm";
import { AppSplash, QuietLoader } from "@/components/LoadingScreen";
import type { Category, DateFilter, ViewFilter } from "@/lib/constants";
import { CATEGORIES } from "@/lib/constants";
import type { Entry } from "@/lib/types";
import { matchesDateFilter, sortEntries } from "@/lib/utils";

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
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyToEntry, setFlyToEntry] = useState<Entry | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [exitPinModeSignal, setExitPinModeSignal] = useState(0);
  const [introReady, setIntroReady] = useState(false);
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(
    null
  );

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
    }
  }, [showSubmit]);

  const eventCount = useMemo(
    () =>
      allEntries.filter(
        (e) => e.type === "event" && matchesDateFilter(e, "upcoming")
      ).length,
    [allEntries]
  );

  const placeCount = useMemo(
    () => allEntries.filter((e) => e.type === "place").length,
    [allEntries]
  );

  const allCount = eventCount + placeCount;

  const typeEntries = useMemo(() => {
    if (viewFilter === "all") return allEntries;
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
    } else if (viewFilter === "all") {
      result = result.filter(
        (e) => e.type === "place" || matchesDateFilter(e, dateFilter)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((e) => selectedCategories.includes(e.category));
    }

    return sortEntries(result, viewFilter);
  }, [typeEntries, viewFilter, dateFilter, selectedCategories]);

  /** Map shows everything until the user applies a real filter */
  const mapEntries = useMemo(() => {
    const hasActiveFilters =
      viewFilter !== "all" ||
      selectedCategories.length > 0 ||
      dateFilter !== "upcoming";

    if (!hasActiveFilters) {
      return sortEntries(allEntries, "all");
    }
    return filteredEntries;
  }, [allEntries, filteredEntries, viewFilter, selectedCategories, dateFilter]);

  const handleViewFilterChange = useCallback((filter: ViewFilter) => {
    setViewFilter(filter);
    setSelectedId(null);
    setFlyToEntry(null);
    setSelectedCategories([]);
  }, []);

  const handleSelect = useCallback((entry: Entry | null) => {
    setSelectedId(entry?.id ?? null);
    if (entry) setFlyToEntry(entry);
  }, []);

  const handleListSelect = useCallback((entry: Entry) => {
    setSelectedId(entry.id);
    setFlyToEntry({ ...entry });
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

  // Never leave the splash waiting forever if the fetch hangs
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => setLoading(false), 10000);
    return () => window.clearTimeout(t);
  }, [loading]);

  return (
    <AppSplash ready={!loading} onIntroDone={handleIntroDone}>
      <div className="flex h-dvh flex-col lg:flex-row">
      {/* Left: brand + list */}
      <section className="relative flex min-h-0 min-w-0 flex-[1.15] flex-col overflow-hidden bg-surface lg:h-full lg:w-[32%] lg:max-w-[420px] lg:flex-none">
        <Header variant="sidebar" />

        {showSubmit ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">
                  Suggest an event or place
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">
                  Shows as pending until an admin verifies it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPinMode(false);
                  setDraftPin(null);
                  setShowSubmit(false);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-sm transition hover:border-ink-faint hover:bg-wash"
              >
                <span aria-hidden className="text-base leading-none">
                  ×
                </span>
                Close
              </button>
            </div>
            <div className="rounded-xl border border-line bg-wash p-4 sm:p-5">
              <SubmitForm
                compact
                defaultType={suggestDefault}
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
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-24 sm:px-4">
              {error ? (
                <div className="rounded-xl bg-danger-soft px-4 py-6 text-center">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              ) : (
                <EntryList
                  entries={filteredEntries}
                  selectedId={selectedId}
                  onSelect={handleListSelect}
                  loading={loading}
                  viewFilter={viewFilter}
                  animateIn={introReady}
                />
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/90 to-transparent px-3 pb-4 pt-10 sm:px-4">
              <button
                type="button"
                onClick={openSuggest}
                className="btn-primary pointer-events-auto mx-auto flex w-full max-w-sm items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold shadow-lg"
              >
                Add an Event/Spot
              </button>
            </div>
          </>
        )}
      </section>

      {/* Right: full-viewport map on desktop; filters float on top */}
      <aside className="relative h-[38vh] max-h-[340px] shrink-0 border-t border-line lg:h-full lg:max-h-none lg:min-w-0 lg:flex-1 lg:border-l lg:border-t-0">
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
            onSuggest={!showSubmit ? openSuggest : undefined}
            onSuggestAt={!showSubmit ? openSuggestAt : undefined}
            animatePins={introReady}
          />
        </div>
        {!showSubmit && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-3 pt-3">
            <div className="pointer-events-auto w-full max-w-[520px]">
              <FiltersBar
                floating
                viewFilter={viewFilter}
                onViewFilterChange={handleViewFilterChange}
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                availableCategories={availableCategories}
                allCount={allCount}
                eventCount={eventCount}
                placeCount={placeCount}
              />
            </div>
          </div>
        )}
        {!showSubmit && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-30 w-[min(calc(100%-1.5rem),280px)]">
            <div className="pointer-events-auto">
              <StayUpdated />
            </div>
          </div>
        )}
      </aside>
      </div>
    </AppSplash>
  );
}
