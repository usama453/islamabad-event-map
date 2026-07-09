"use client";

import { FormEvent, useState } from "react";

interface StayUpdatedProps {
  className?: string;
}

export function StayUpdated({ className = "" }: StayUpdatedProps) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"new" | "existing" | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), website: honeypot }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not subscribe");
        return;
      }
      setDone(data.alreadySubscribed ? "existing" : "new");
      setEmail("");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div
        className={`rounded-xl border border-line bg-surface/95 px-3 py-3 text-center shadow-sm backdrop-blur-sm ${className}`}
      >
        <p className="text-sm font-semibold text-ink">
          {done === "existing" ? "You’re already on the list" : "You’re in"}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          We’ll ping you when new spots and events land.
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`w-full rounded-full border border-line-strong bg-surface/95 px-4 py-2.5 text-sm font-semibold text-ink shadow-sm backdrop-blur-sm transition hover:border-ink-faint hover:bg-wash ${className}`}
      >
        Stay updated
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative rounded-xl border border-line bg-surface/95 p-3 shadow-sm backdrop-blur-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Stay in the loop</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Occasional notes when Islamabad gets new spots &amp; events.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setError(null);
          }}
          className="shrink-0 text-sm font-semibold text-ink-muted hover:text-ink"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="subscribe-website">Website</label>
        <input
          id="subscribe-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-[var(--ring)]"
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? "…" : "Join"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-danger">{error}</p>
      )}
    </form>
  );
}
