"use client";

import { useEffect } from "react";

const STORAGE_KEY = "isb-explore-welcome-seen";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onAddSpot: () => void;
}

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // ignore
  }
}

export function WelcomeModal({ open, onClose, onAddSpot }: WelcomeModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="welcome-overlay fixed inset-0 z-[75] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="welcome-panel relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-line bg-surface shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="welcome-hero relative h-28 overflow-hidden sm:h-32"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,color-mix(in_srgb,var(--blue)_55%,transparent),transparent_55%),radial-gradient(90%_70%_at_90%_30%,color-mix(in_srgb,var(--orange)_45%,transparent),transparent_50%),linear-gradient(160deg,var(--wash),var(--surface))]" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
          <div className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--blue)] shadow-md">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
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
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/90 text-base leading-none text-ink shadow-sm backdrop-blur-sm transition hover:bg-wash"
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--blue)]">
            Islamabad Explore
          </p>
          <h2
            id="welcome-title"
            className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.65rem]"
          >
            Built by the city, for the city
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            This is a community-driven map of events and spots around Islamabad.
            If you know a good place — or something happening soon — add it.
          </p>

          <ul className="mt-4 space-y-2.5 text-sm text-ink">
            <li className="flex gap-2.5">
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--blue-soft)] text-[11px] font-bold text-[var(--blue)]"
                aria-hidden
              >
                1
              </span>
              <span>
                <span className="font-semibold">Add spots you know</span>
                <span className="text-ink-muted">
                  {" "}
                  — cafés, trails, hangouts, hidden gems.
                </span>
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--orange-soft)] text-[11px] font-bold text-[var(--orange)]"
                aria-hidden
              >
                2
              </span>
              <span>
                <span className="font-semibold">Share upcoming events</span>
                <span className="text-ink-muted">
                  {" "}
                  — gigs, markets, meetups, anything worth showing up for.
                </span>
              </span>
            </li>
            <li className="flex gap-2.5">
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wash text-[11px] font-bold text-ink-muted"
                aria-hidden
              >
                3
              </span>
              <span>
                <span className="font-semibold">New pins show as pending</span>
                <span className="text-ink-muted">
                  {" "}
                  until someone verifies them — then they go live for everyone.
                </span>
              </span>
            </li>
          </ul>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddSpot();
              }}
              className="btn-primary flex-1 rounded-full border px-4 py-2.5 text-sm font-semibold"
            >
              Add a spot or event
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-wash"
            >
              Explore the map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
