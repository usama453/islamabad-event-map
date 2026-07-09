"use client";

import { useEffect } from "react";
import { KohMascot } from "./KohMascot";

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
      className="koh-about-overlay fixed inset-0 z-[75] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="koh-about-window relative w-full max-w-[440px] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="koh-about-titlebar">
          <span className="koh-about-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="font-pixel text-[10px] tracking-wide text-[#f4e8c8] sm:text-[11px]">
            WELCOME.EXE
          </span>
          <button
            type="button"
            onClick={onClose}
            className="koh-about-x font-pixel"
            aria-label="Close"
          >
            X
          </button>
        </div>

        <div className="koh-about-body">
          <div className="koh-about-scanlines" aria-hidden />
          <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="koh-about-sprite shrink-0">
              <KohMascot size={72} mood="wave" label="Koh" />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p
                id="welcome-title"
                className="font-pixel text-[11px] leading-relaxed text-[#7dff9a] sm:text-[12px]"
              >
                COMMUNITY MAP
              </p>
              <p className="mt-1 font-pixel text-[9px] uppercase tracking-wider text-[#c8b48a]">
                Built by the city · for the city
              </p>
            </div>
          </div>

          <div className="koh-about-copy mt-4 space-y-3 font-pixel text-[9px] leading-[1.85] text-[#f0e6c8] sm:text-[10px]">
            <p>
              This is a community-driven map of Islamabad. Know a good spot?
              Something happening soon? Drop it on the map.
            </p>
            <p>
              <span className="text-[#7dff9a]">1.</span> Add spots you know —
              cafés, trails, hangouts, hidden gems.
            </p>
            <p>
              <span className="text-[#ff9a4a]">2.</span> Share upcoming events —
              gigs, markets, meetups, anything worth showing up for.
            </p>
            <p>
              <span className="text-[#c8b48a]">3.</span> New pins show as pending
              until someone verifies them — then they go live for everyone.
            </p>
            <p className="text-[#7dff9a]">
              &gt; Press X to close. Or click the fog.
              <span className="koh-about-cursor" aria-hidden>
                _
              </span>
            </p>
          </div>

          <div className="relative mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddSpot();
              }}
              className="koh-about-btn flex-1 font-pixel"
            >
              ADD A SPOT
            </button>
            <button
              type="button"
              onClick={onClose}
              className="koh-about-btn koh-about-btn-secondary flex-1 font-pixel"
            >
              EXPLORE MAP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
