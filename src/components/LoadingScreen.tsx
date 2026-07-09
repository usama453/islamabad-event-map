"use client";

import { useEffect, useRef, useState } from "react";
import { KohMascot } from "./KohMascot";

interface LoadingScreenProps {
  /** When true, begin fade-out */
  ready?: boolean;
  /** Minimum time visible (ms) so it doesn't flash */
  minDuration?: number;
  label?: string;
  onDone?: () => void;
}

/** Full-viewport splash — the only Koh loader on first paint */
export function LoadingScreen({
  ready = false,
  minDuration = 900,
  label = "Finding spots in Islamabad…",
  onDone,
}: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [started] = useState(() => Date.now());
  const finished = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!ready || finished.current) return;

    const elapsed = Date.now() - started;
    const wait = Math.max(0, minDuration - elapsed);
    let exitTimer: number | undefined;

    const startTimer = window.setTimeout(() => {
      setExiting(true);
      exitTimer = window.setTimeout(() => {
        if (finished.current) return;
        finished.current = true;
        setVisible(false);
        onDoneRef.current?.();
      }, 420);
    }, wait);

    return () => {
      window.clearTimeout(startTimer);
      if (exitTimer) window.clearTimeout(exitTimer);
    };
  }, [ready, minDuration, started]);

  // Safety: never leave the splash up forever if something stalls
  useEffect(() => {
    const failsafe = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      setExiting(true);
      setVisible(false);
      onDoneRef.current?.();
    }, 8000);
    return () => window.clearTimeout(failsafe);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface transition-opacity duration-[400ms] ease-out ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
    >
      <div className="loader-wash" aria-hidden />
      <div className="relative flex flex-col items-center gap-4">
        <div className="koh-loader-ring koh-loader-ring-lg">
          <KohMascot size={80} mood="run" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight text-ink">
            Islamabad Explore
          </p>
          <p className="mt-1 text-sm text-ink-muted">{label}</p>
        </div>
        <div className="loader-bar" aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
}

/** Quiet placeholder — dots only, no mascot */
export function QuietLoader({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-20 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="loader-dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p className="text-sm text-ink-muted">{label}</p>
    </div>
  );
}

interface AppSplashProps {
  children: React.ReactNode;
  ready: boolean;
  onIntroDone?: () => void;
}

/**
 * Opaque full-screen splash. Children mount underneath (data/map load)
 * but only this one Koh is visible until ready.
 */
export function AppSplash({ children, ready, onIntroDone }: AppSplashProps) {
  const [showSplash, setShowSplash] = useState(true);
  const onIntroDoneRef = useRef(onIntroDone);
  onIntroDoneRef.current = onIntroDone;

  return (
    <>
      {children}
      {showSplash && (
        <LoadingScreen
          ready={ready}
          onDone={() => {
            setShowSplash(false);
            onIntroDoneRef.current?.();
          }}
          label="Finding spots in Islamabad…"
        />
      )}
    </>
  );
}
