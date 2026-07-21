import type { Map as MapboxMap } from "mapbox-gl";
import type { MapCameraView } from "@/lib/constants";

/** Try to read the visitor's current position; resolves null on denial/timeout */
export function getUserLocation(
  timeoutMs: number
): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: { lat: number; lng: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        finish({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        window.clearTimeout(timer);
        finish(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 }
    );
  });
}

/** Gentler ramp than cubic/quart — motion is visible sooner without feeling abrupt */
function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Animate standard map camera; end frame is the normal exploration view.
 * Zoom eases smoothly throughout while position lags behind at first, so the
 * motion reads as "zoom out, then glide into place" instead of an immediate
 * sideways pan. */
export function animateLaunchCamera(
  map: MapboxMap,
  from: MapCameraView,
  to: MapCameraView,
  pitch: number,
  bearing: number,
  durationMs: number,
  onComplete?: () => void
): () => void {
  let raf = 0;
  const startedAt = performance.now();

  const frame = (now: number) => {
    const t = Math.min(1, (now - startedAt) / durationMs);
    const zoomT = easeInOutQuad(t);
    const panT = easeInOutCubic(t);
    const lng = from.lng + (to.lng - from.lng) * panT;
    const lat = from.lat + (to.lat - from.lat) * panT;
    const zoom = from.zoom + (to.zoom - from.zoom) * zoomT;

    map.jumpTo({
      center: [lng, lat],
      zoom,
      pitch,
      bearing,
    });

    if (t < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      onComplete?.();
    }
  };

  map.jumpTo({
    center: [from.lng, from.lat],
    zoom: from.zoom,
    pitch,
    bearing,
  });
  raf = requestAnimationFrame(frame);

  return () => cancelAnimationFrame(raf);
}
