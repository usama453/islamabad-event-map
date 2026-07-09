"use client";

import Link from "next/link";
import { DarkModeToggle } from "./DarkModeToggle";

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

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="Islamabad Explore home"
        >
          <MapLogo className="h-10 w-10 shrink-0" />
          <span className="hidden text-lg font-semibold tracking-tight text-ink sm:block">
            Islamabad Explore
          </span>
        </Link>

        <DarkModeToggle />
      </div>
    </header>
  );
}
