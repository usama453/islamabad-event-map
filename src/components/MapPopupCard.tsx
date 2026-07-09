"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Entry } from "@/lib/types";
import {
  entryBodyText,
  entryContactPhone,
  entryOrganizerName,
  formatEventSchedule,
  getEntryImage,
  happeningSoonLabel,
  hasCoordinates,
  truncate,
} from "@/lib/utils";

interface MapPopupCardProps {
  entry: Entry;
  onClose: () => void;
}

function seedCount(id: string, base: number, span: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return base + (hash % span);
}

export function MapPopupCard({ entry, onClose }: MapPopupCardProps) {
  const [registered, setRegistered] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewSaved, setReviewSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const image = getEntryImage(entry);
  const schedule = formatEventSchedule(entry);
  const body = entryBodyText(entry);
  const contactPhone = entryContactPhone(entry);
  const organizer = entryOrganizerName(entry);
  const isEvent = entry.type === "event";
  const isPending = entry.status === "pending";
  const soonLabel = isEvent && !isPending ? happeningSoonLabel(entry) : null;
  const goingBase = useMemo(() => seedCount(entry.id, 12, 48), [entry.id]);
  const likeBase = useMemo(() => seedCount(entry.id + "♥", 8, 90), [entry.id]);
  const reviewBase = useMemo(
    () => seedCount(entry.id + "★", 3, 18),
    [entry.id]
  );

  const goingCount = goingBase + (registered ? 1 : 0);
  const likeCount = likeBase + (liked ? 1 : 0);

  const mapsUrl =
    hasCoordinates(entry)
      ? `https://www.google.com/maps/dir/?api=1&destination=${entry.lat},${entry.lng}`
      : entry.locationText
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.locationText)}`
        : null;

  useEffect(() => {
    setRegistered(false);
    setLiked(false);
    setSaved(false);
    setReviewOpen(false);
    setReviewText("");
    setReviewSaved(false);
    setToast(null);
  }, [entry.id]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const flash = (message: string) => setToast(message);

  const share = async () => {
    const shareData = {
      title: entry.title,
      text: `${entry.title} — Islamabad Explore`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        flash("Shared");
      } else {
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.url}`
        );
        flash("Link copied");
      }
    } catch {
      flash("Share cancelled");
    }
  };

  return (
    <div
      className="map-popup-card w-[320px] overflow-hidden sm:w-[340px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative h-[140px] w-full bg-line">
        <Image
          src={image}
          alt=""
          fill
          className="object-cover"
          sizes="340px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-sm text-white backdrop-blur-sm transition hover:bg-black/60"
        >
          ×
        </button>
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ${
            isPending
              ? "bg-[var(--pending)]"
              : isEvent
                ? "bg-[var(--orange)]"
                : "bg-[var(--blue)]"
          }`}
        >
          {isEvent ? "Event" : "Place"} · {CATEGORY_LABELS[entry.category]}
        </span>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-[17px] font-semibold leading-snug text-white drop-shadow">
            {entry.title}
          </h3>
        </div>
      </div>

      <div className="space-y-3 bg-surface p-3.5">
        <div className="space-y-1 text-sm">
          {isPending && (
            <p className="mb-1 rounded-lg border border-dashed border-[color-mix(in_srgb,var(--pending)_45%,transparent)] bg-[var(--pending-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--pending-deep)]">
              Awaiting admin review — not verified yet.
            </p>
          )}
          {soonLabel && (
            <span className="soon-badge mb-1">
              <span className="soon-badge-dot" aria-hidden />
              {soonLabel}
            </span>
          )}
          {organizer && (
            <p className="font-medium text-ink">by {organizer}</p>
          )}
          {isEvent && (
            <p className="font-medium entry-meta-event">
              {schedule ?? "Date TBA"}
            </p>
          )}
          {entry.locationText?.trim() &&
            !entry.locationText.toLowerCase().includes("not finalised") && (
              <p className="text-ink-muted">{entry.locationText.trim()}</p>
            )}
          {contactPhone && (
            <a
              href={`tel:${contactPhone.replace(/\s+/g, "")}`}
              className="inline-block font-medium text-[var(--blue)] underline-offset-2 hover:underline"
            >
              {contactPhone}
            </a>
          )}
          {body && (
            <p className="pt-0.5 leading-relaxed text-ink-muted">
              {truncate(body, 160)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-muted">
          {isEvent && (
            <span>
              <strong className="font-semibold text-ink">{goingCount}</strong>{" "}
              registered
            </span>
          )}
          <span>
            <strong className="font-semibold text-ink">{likeCount}</strong> likes
          </span>
          <span>
            <strong className="font-semibold text-ink">
              {reviewBase + (reviewSaved ? 1 : 0)}
            </strong>{" "}
            reviews
          </span>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={() => {
            if (isEvent) {
              setRegistered((v) => !v);
              flash(
                registered
                  ? "Registration cancelled (demo)"
                  : "Registered — see you there! (demo)"
              );
            } else {
              setSaved((v) => !v);
              flash(saved ? "Removed from saved" : "Saved to your list (demo)");
            }
          }}
          className={`btn-primary flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
            (isEvent && registered) || (!isEvent && saved) ? "opacity-95" : ""
          }`}
        >
          {isEvent ? (
            registered ? (
              <>Registered ✓</>
            ) : (
              <>Register now</>
            )
          ) : saved ? (
            <>Saved ✓</>
          ) : (
            <>Save this spot</>
          )}
        </button>

        {/* Icon actions */}
        <div className="flex items-center justify-between gap-1">
          <IconAction
            label={liked ? "Unlike" : "Like"}
            active={liked}
            onClick={() => {
              setLiked((v) => !v);
              flash(liked ? "Like removed" : "Liked");
            }}
          >
            <HeartIcon filled={liked} />
          </IconAction>

          <IconAction
            label="Comment"
            active={reviewOpen || reviewSaved}
            onClick={() => {
              setReviewOpen((v) => !v);
              setToast(null);
            }}
          >
            <CommentIcon />
          </IconAction>

          <IconAction
            label="Share"
            onClick={() => {
              void share();
            }}
          >
            <ShareIcon />
          </IconAction>

          <IconAction
            label="Directions"
            disabled={!mapsUrl}
            onClick={() => {
              if (!mapsUrl) return;
              window.open(mapsUrl, "_blank", "noopener,noreferrer");
              flash("Opening directions…");
            }}
          >
            <DirectionsIcon />
          </IconAction>

          <IconAction
            label={saved ? "Unsave" : "Save"}
            active={saved}
            onClick={() => {
              setSaved((v) => !v);
              flash(saved ? "Removed from saved" : "Saved (demo)");
            }}
          >
            <BookmarkIcon filled={saved} />
          </IconAction>
        </div>

        {reviewOpen && (
          <div className="space-y-2 rounded-lg border border-line bg-wash p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Leave a comment
            </p>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              placeholder="What did you think? (demo only — not saved)"
              className="w-full resize-none rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-[var(--ring)]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReviewOpen(false);
                  setReviewText("");
                }}
                className="px-2.5 py-1.5 text-sm text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reviewText.trim()}
                onClick={() => {
                  setReviewSaved(true);
                  setReviewOpen(false);
                  flash("Comment posted (demo)");
                }}
                className="btn-primary rounded-full border px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        )}

        {entry.sourceUrl && (
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-ink underline-offset-2 hover:underline"
          >
            View source →
          </a>
        )}

        {toast && (
          <p className="rounded-lg bg-wash px-2.5 py-1.5 text-center text-[12px] font-medium text-ink">
            {toast}
          </p>
        )}
      </div>
    </div>
  );
}

function IconAction({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
        active
          ? "btn-primary btn-primary-selected"
          : "border-line-strong text-ink hover:bg-wash disabled:cursor-not-allowed disabled:opacity-35"
      }`}
    >
      {children}
    </button>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M12 20.4s-6.8-4.2-9.2-8.1C1.2 9.6 2 6.4 5 5.4c1.9-.6 3.8.2 4.9 1.7C11.1 5.6 13 .8 15 5.4c3 1 3.8 4.2 2.2 7-2.4 3.9-5.2 8-5.2 8Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M5 5.5h14a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H10l-4.5 3.2V16H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="18" cy="5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.2 10.8 15.7 6.4M8.2 13.2l7.5 4.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DirectionsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 8v5.5h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.5L6 20V5.5a1 1 0 0 1 1-1Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
