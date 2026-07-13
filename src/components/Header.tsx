"use client";

import Link from "next/link";
import { DarkModeToggle } from "./DarkModeToggle";
import type { ViewFilter } from "@/lib/constants";

function MapLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
    >
      <rect width="40" height="40" rx="12" fill="var(--blue)" />
      <path
        d="M10 14.5 17 12l6.5 2.5L30 12.2v15.3L23.5 30 17 27.5 10 30V14.5Z"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M17 12v15.5M23.5 14.5V30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="21" r="2.6" fill="white" />
    </svg>
  );
}

function listingCountLabel(count: number, viewFilter: ViewFilter): string {
  if (viewFilter === "event") {
    return `${count} event${count !== 1 ? "s" : ""}`;
  }
  return `${count} spot${count !== 1 ? "s" : ""}`;
}

interface HeaderProps {
  /** Compact brand bar for the left sidebar */
  variant?: "bar" | "sidebar";
  listingCount?: number;
  viewFilter?: ViewFilter;
}

export function Header({
  variant = "bar",
  listingCount,
  viewFilter = "place",
}: HeaderProps) {
  if (variant === "sidebar") {
    return (
      <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-surface px-2.5 py-1.5 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 sm:gap-2.5"
            aria-label="Islamabad Explore home"
          >
            <MapLogo className="h-7 w-7 shrink-0 sm:h-9 sm:w-9" />
            <span className="min-w-0 leading-tight">
              <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span className="text-[13px] font-semibold tracking-tight text-ink sm:text-base">
                  Islamabad Explore
                </span>
                {listingCount != null && (
                  <span className="text-[11px] font-medium tabular-nums text-ink-muted sm:text-xs">
                    · {listingCountLabel(listingCount, viewFilter)}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[10px] font-medium leading-snug text-ink-muted sm:text-[11px]">
                Community map of events &amp; spots
              </span>
            </span>
          </Link>
          <div className="shrink-0">
            <DarkModeToggle />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Islamabad Explore home"
        >
          <MapLogo className="h-10 w-10 shrink-0" />
          <span className="leading-tight">
            <span className="block text-base font-semibold tracking-tight text-ink sm:text-lg">
              Islamabad Explore
            </span>
            <span className="mt-0.5 block text-xs font-medium text-ink-muted">
              Community map of events &amp; spots
            </span>
          </span>
        </Link>
        <div className="shrink-0">
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}
