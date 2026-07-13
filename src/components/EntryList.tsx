"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Entry } from "@/lib/types";
import type { Category, ViewFilter } from "@/lib/constants";
import { EntryCard } from "./EntryCard";
import { KohMascot } from "./KohMascot";
import { QuietLoader } from "./LoadingScreen";

const STACK_MAX_STAGGER = 14;

interface EntryListProps {
  entries: Entry[];
  selectedId: string | null;
  onSelect: (entry: Entry) => void;
  loading: boolean;
  viewFilter: ViewFilter;
  /** Start stack-in after splash (page load) */
  animateIn?: boolean;
  viewedIds?: Set<string>;
  focusedCategories?: Category[];
  onAdd?: () => void;
}

function emptyCopy(viewFilter: ViewFilter): { title: string; body: string } {
  if (viewFilter === "event") {
    return {
      title: "No events yet",
      body: "Nothing scheduled in this view — switch to Spots, or add an event so others can find it.",
    };
  }
  return {
    title: "No spots yet",
    body: "No places match these filters — switch to Events, or add a café, trail, or hangout you know.",
  };
}

function ListFooter({
  viewFilter,
  onAdd,
}: {
  viewFilter: ViewFilter;
  onAdd?: () => void;
}) {
  if (!onAdd) return null;

  const isEvent = viewFilter === "event";

  return (
    <div className="mt-6 border-t border-line px-2 pb-6 pt-6 text-center sm:mt-8 sm:px-3 sm:pb-8 sm:pt-8">
      <p className="mx-auto max-w-[260px] text-sm leading-relaxed text-ink-muted sm:max-w-[280px] sm:text-[15px]">
        {isEvent
          ? "Know something happening in Islamabad? Share it with us."
          : "Do you know a good spot?"}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 text-sm font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition hover:decoration-ink sm:mt-3.5"
      >
        Add on map
      </button>
    </div>
  );
}

export function EntryList({
  entries,
  selectedId,
  onSelect,
  loading,
  viewFilter,
  animateIn = false,
  viewedIds,
  focusedCategories = [],
  onAdd,
}: EntryListProps) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  /** pending → hidden until splash; animating → stack-in; done → normal */
  const [stackPhase, setStackPhase] = useState<"pending" | "animating" | "done">(
    "pending"
  );

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

  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current[selectedId];
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  if (loading) {
    return <QuietLoader label="Loading listings…" />;
  }

  if (entries.length === 0) {
    const empty = emptyCopy(viewFilter);
    return (
      <div>
        <div className="flex flex-col items-center py-8 text-center sm:py-16">
          <KohMascot size={48} mood="look" interactive />
          <p className="mt-2 text-base font-semibold text-ink sm:mt-3 sm:text-lg">
            {empty.title}
          </p>
          <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-ink-muted sm:text-sm">
            {empty.body}
          </p>
        </div>
        <ListFooter viewFilter={viewFilter} onAdd={onAdd} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-0.5 sm:gap-1">
        {entries.map((entry, index) => {
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
                  isViewed={viewedIds?.has(entry.id)}
                  isDimmed={
                    focusedCategories.length > 0 &&
                    !focusedCategories.includes(entry.category)
                  }
                  onClick={() => onSelect(entry)}
                />
              </div>
            </div>
          );
        })}
      </div>
      <ListFooter viewFilter={viewFilter} onAdd={onAdd} />
    </div>
  );
}
