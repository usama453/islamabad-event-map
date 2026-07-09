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
  if (viewFilter === "place") return "spots";
  return "listings";
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
      <div className="flex flex-col items-center py-8 text-center sm:py-16">
        <KohMascot size={48} mood="look" interactive />
        <p className="mt-2 text-base font-semibold text-ink sm:mt-3 sm:text-lg">
          No {emptyLabel(viewFilter)} yet
        </p>
        <p className="mt-1 max-w-[240px] text-xs text-ink-muted sm:text-sm">
          Suggest one using the button below — Koh will keep watch.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-0.5 sm:gap-1">
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
                  className="group/expand flex w-full items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-[var(--orange)] transition hover:text-[color-mix(in_srgb,var(--orange)_80%,black)] sm:py-2 sm:text-sm"
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
