"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Entry } from "@/lib/types";
import type { ViewFilter } from "@/lib/constants";
import { EntryCard } from "./EntryCard";
import { KohMascot } from "./KohMascot";
import { QuietLoader } from "./LoadingScreen";

const EVENT_PREVIEW_COUNT = 3;
const STACK_MAX_STAGGER = 14;

interface EntryListProps {
  entries: Entry[];
  selectedId: string | null;
  onSelect: (entry: Entry) => void;
  loading: boolean;
  viewFilter: ViewFilter;
  /** Start stack-in after splash (page load) */
  animateIn?: boolean;
}

function emptyLabel(viewFilter: ViewFilter): string {
  if (viewFilter === "event") return "events";
  if (viewFilter === "place") return "places";
  return "listings";
}

function countLabel(count: number, viewFilter: ViewFilter): string {
  if (viewFilter === "event") {
    return `${count} event${count !== 1 ? "s" : ""}`;
  }
  if (viewFilter === "place") {
    return `${count} place${count !== 1 ? "s" : ""}`;
  }
  return `${count} listing${count !== 1 ? "s" : ""}`;
}

function ChevronIcon({
  className = "",
  up = false,
}: {
  className?: string;
  up?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d={up ? "M4 10.5 8 6.5l4 4" : "M4 6.5 8 10.5l4-4"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EntryList({
  entries,
  selectedId,
  onSelect,
  loading,
  viewFilter,
  animateIn = false,
}: EntryListProps) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [eventsExpanded, setEventsExpanded] = useState(false);
  /** pending → hidden until splash; animating → stack-in; done → normal */
  const [stackPhase, setStackPhase] = useState<"pending" | "animating" | "done">(
    "pending"
  );

  // Reset collapse when leaving All view or when the listing set changes a lot
  useEffect(() => {
    setEventsExpanded(false);
  }, [viewFilter]);

  // Play stack-in once after splash, when listings are ready
  useEffect(() => {
    if (!animateIn || loading || entries.length === 0 || stackPhase !== "pending")
      return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) {
      setStackPhase("done");
      return;
    }

    setStackPhase("animating");
    const n = Math.min(entries.length, STACK_MAX_STAGGER + 1);
    const doneMs = 120 + n * 70 + 500;
    const t = window.setTimeout(() => setStackPhase("done"), doneMs);
    return () => window.clearTimeout(t);
  }, [animateIn, loading, entries.length, stackPhase]);

  const { previewEntries, hiddenEventCount, toggleAfterIndex, canToggle } =
    useMemo(() => {
      if (viewFilter !== "all") {
        return {
          previewEntries: entries,
          hiddenEventCount: 0,
          toggleAfterIndex: -1,
          canToggle: false,
        };
      }

      const events = entries.filter((e) => e.type === "event");
      const places = entries.filter((e) => e.type === "place");
      const hidden = Math.max(0, events.length - EVENT_PREVIEW_COUNT);
      const canToggle = hidden > 0;
      const shownEvents = eventsExpanded
        ? events
        : events.slice(0, EVENT_PREVIEW_COUNT);
      const preview = [...shownEvents, ...places];

      return {
        previewEntries: preview,
        hiddenEventCount: hidden,
        toggleAfterIndex: shownEvents.length > 0 ? shownEvents.length - 1 : -1,
        canToggle,
      };
    }, [entries, viewFilter, eventsExpanded]);

  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current[selectedId];
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  if (loading) {
    return <QuietLoader label="Loading listings…" />;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <KohMascot size={64} mood="look" interactive />
        <p className="mt-3 text-lg font-semibold text-ink">
          No {emptyLabel(viewFilter)} yet
        </p>
        <p className="mt-1 max-w-[240px] text-sm text-ink-muted">
          Suggest one using the button in the top bar — Koh will keep watch.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ink-muted">
        {countLabel(entries.length, viewFilter)}
      </p>
      <div className="flex flex-col gap-1">
        {previewEntries.map((entry, index) => {
          const stagger = Math.min(index, STACK_MAX_STAGGER);
          return (
            <div
              key={entry.id}
              className={
                stackPhase === "animating" ? "list-stack-item" : undefined
              }
              style={
                stackPhase === "animating"
                  ? ({ "--stack-i": stagger } as CSSProperties)
                  : stackPhase === "pending"
                    ? { opacity: 0 }
                    : undefined
              }
            >
              <div
                ref={(node) => {
                  cardRefs.current[entry.id] = node;
                }}
              >
                <EntryCard
                  entry={entry}
                  isSelected={selectedId === entry.id}
                  onClick={() => onSelect(entry)}
                />
              </div>
              {canToggle && index === toggleAfterIndex && (
                <button
                  type="button"
                  onClick={() => setEventsExpanded((v) => !v)}
                  aria-expanded={eventsExpanded}
                  className="group/expand flex w-full items-center justify-center gap-1.5 px-2 py-2 text-sm font-semibold text-[var(--orange)] transition hover:text-[color-mix(in_srgb,var(--orange)_80%,black)]"
                >
                  {eventsExpanded ? (
                    <>
                      Show fewer events
                      <ChevronIcon
                        className="h-4 w-4 transition group-hover/expand:-translate-y-0.5"
                        up
                      />
                    </>
                  ) : (
                    <>
                      View all events
                      <span className="tabular-nums opacity-70">
                        (+{hiddenEventCount})
                      </span>
                      <ChevronIcon className="h-4 w-4 transition group-hover/expand:translate-y-0.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
