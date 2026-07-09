const STALE_MS = 45_000;

type PresenceStore = Map<string, number>;

declare global {
  // eslint-disable-next-line no-var
  var __isbPresence: PresenceStore | undefined;
}

function store(): PresenceStore {
  if (!globalThis.__isbPresence) {
    globalThis.__isbPresence = new Map();
  }
  return globalThis.__isbPresence;
}

function prune(now = Date.now()) {
  const map = store();
  map.forEach((lastSeen, id) => {
    if (now - lastSeen > STALE_MS) map.delete(id);
  });
}

export function touchPresence(visitorId: string): number {
  const now = Date.now();
  const map = store();
  map.set(visitorId, now);
  prune(now);
  return map.size;
}

export function getPresenceCount(): number {
  prune();
  return store().size;
}
