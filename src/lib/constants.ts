export const CATEGORIES = ["food", "scenic", "hidden", "activity"] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food",
  scenic: "Scenic",
  hidden: "Hidden",
  activity: "Activity",
};

/** Distinct colors per spot/event category (map pins, badges) */
export const CATEGORY_COLORS: Record<Category, string> = {
  food: "#E85D04",
  scenic: "#2D6A4F",
  hidden: "#7B2CBF",
  activity: "#0077B6",
};

/** Map old Airtable / localStorage values onto the current four categories */
export function normalizeCategory(value: unknown): Category {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if ((CATEGORIES as readonly string[]).includes(raw)) {
    return raw as Category;
  }

  const legacy: Record<string, Category> = {
    nature: "scenic",
    culture: "scenic",
    art: "scenic",
    nightlife: "activity",
    sports: "activity",
    kids: "activity",
    music: "activity",
    education: "activity",
    shopping: "hidden",
    other: "hidden",
  };
  return legacy[raw] ?? "hidden";
}

/** Map pins — candy palette, slightly deeper for map contrast */
export const MAP_PIN_COLORS = {
  event: "#F06A8D",
  place: "#4BA8E8",
  pending: "#E8B43A",
} as const;

/** Per-category pin colors — candy tones, a notch darker than before */
export const MAP_CATEGORY_PIN_COLORS: Record<Category, string> = {
  food: "#F07A55",
  scenic: "#4DBF8A",
  hidden: "#A78BE8",
  activity: "#4BA8E8",
};

/** Multiple Unsplash options per category so listings don't all share one photo */
export const CATEGORY_IMAGE_POOLS: Record<Category, string[]> = {
  food: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop",
  ],
  scenic: [
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1548013146-72479768bada?w=600&h=600&fit=crop",
  ],
  hidden: [
    "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&h=600&fit=crop",
  ],
  activity: [
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=600&fit=crop",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=600&fit=crop",
  ],
};

/** Landmark / known-spot images (matched by title substring) */
export const PLACE_IMAGES: { match: string; url: string }[] = [
  {
    match: "faisal mosque",
    url: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=600&h=600&fit=crop",
  },
  {
    match: "daman-e-koh",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=600&fit=crop",
  },
  {
    match: "saidpur",
    url: "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&h=600&fit=crop",
  },
  {
    match: "trail 5",
    url: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=600&h=600&fit=crop",
  },
  {
    match: "pakistan monument",
    url: "https://images.unsplash.com/photo-1548013146-72479768bada?w=600&h=600&fit=crop",
  },
  {
    match: "lok virsa",
    url: "https://images.unsplash.com/photo-1578321272176-b7bbc0679853?w=600&h=600&fit=crop",
  },
  {
    match: "rawal lake",
    url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=600&h=600&fit=crop",
  },
  {
    match: "monal",
    url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=600&fit=crop",
  },
  {
    match: "centaurus",
    url: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=600&fit=crop",
  },
  {
    match: "d-chowk",
    url: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=600&fit=crop",
  },
  {
    match: "brew coffee",
    url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop",
  },
  {
    match: "farmers market",
    url: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=600&fit=crop",
  },
];

export const ISLAMABAD_CENTER = {
  lat: 33.6844,
  lng: 73.0479,
};

export const DEFAULT_ZOOM = 12;

/** Flat top-down view */
export const MAP_2D_PITCH = 0;
/** Tilted perspective for 3D buildings and terrain */
export const MAP_3D_PITCH = 77;
export const MAX_MAP_PITCH = 85;
export const DEFAULT_MAP_BEARING = 30;

/** Launch fly-through: Faisal Mosque → city overview */
export interface MapCameraView {
  lng: number;
  lat: number;
  zoom: number;
}

export const LAUNCH_CAMERA = {
  pitch: MAP_3D_PITCH,
  bearing: DEFAULT_MAP_BEARING,
  durationMs: 5200,
  start: {
    lng: 73.0372,
    lat: 33.7299,
    zoom: 16.5,
  } satisfies MapCameraView,
  end: {
    lng: ISLAMABAD_CENTER.lng,
    lat: ISLAMABAD_CENTER.lat,
    zoom: DEFAULT_ZOOM,
  } satisfies MapCameraView,
} as const;

export type EntryType = "event" | "place";

/** Explore page filter — spots-only in the UI (event type still exists in data) */
export type ViewFilter = EntryType;

export type DateFilter = "today" | "week" | "upcoming";

export const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  today: "Today",
  week: "This Week",
  upcoming: "All Upcoming",
};
