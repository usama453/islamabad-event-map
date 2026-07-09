"use client";

import { useEffect } from "react";
import { KohMascot } from "./KohMascot";

interface KohAboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function KohAboutModal({ open, onClose }: KohAboutModalProps) {
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
      className="koh-about-overlay fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="koh-about-title"
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
            KOH.EXE — ABOUT
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
                id="koh-about-title"
                className="font-display text-[1.35rem] font-semibold leading-snug tracking-[-0.02em] text-[#7dff9a] sm:text-[1.5rem]"
              >
                Islamabad Explore
              </p>
              <p className="mt-1.5 font-display text-[0.8rem] italic leading-snug text-[#c8b48a]">
                Level 1 · City unlocked
              </p>
            </div>
          </div>

          <div className="koh-about-copy mt-4 space-y-3.5 font-display text-[0.95rem] leading-[1.55] text-[#f0e6c8] sm:text-[1.02rem]">
            <p>
              Hey. I&apos;m Koh. I walk these sectors so you don&apos;t have to
              guess where the good stuff is.
            </p>
            <p>
              This map is a living scrapbook of Islamabad — jazz under the pines,
              secret cafés, trailheads, pop-ups, and the spots your friend
              &ldquo;knows a guy&rdquo; about.
            </p>
            <p>
              Orange pins = events. Blue pins = spots. Amber ones? Still waiting
              for a human admin to say &ldquo;yep, real.&rdquo;
            </p>
            <p>
              Tap a pin. Filter the chaos. Drop your own find. Margalla&apos;s
              that way. Always.
            </p>
            <p className="font-sans text-xs tracking-wide text-[#7dff9a]">
              Press X to close, or click outside.
              <span className="koh-about-cursor" aria-hidden>
                _
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="koh-about-btn mt-5 w-full"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
