# Islamabad Events & Places Map

Discover events and interesting places in Islamabad on an interactive map. Anyone can suggest a listing; you approve it in Airtable before it goes public.

## Tech stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Airtable** as the database (server-side API routes only)
- **Mapbox GL JS** via `react-map-gl`
- **Vercel** for hosting

Sprites: [Animated Warrior](https://opengameart.org/content/animated-warrior) by Calciumtrice (CC BY 3.0); ghost by ImogiaGames / Balmer (CC0); skeleton by Balmer (CC0). See `public/sprites/ATTRIBUTION.md`.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|---|---|
| `AIRTABLE_TOKEN` | Personal access token from [Airtable](https://airtable.com/create/tokens) with `data.records:read` and `data.records:write` |
| `AIRTABLE_BASE_ID` | Base ID from your Airtable URL (`https://airtable.com/appXXXXXXXX/...`) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public token from [Mapbox](https://account.mapbox.com/access-tokens/) |

### Airtable table: `Entries`

| Field | Type | Notes |
|---|---|---|
| `Type` | Single select | `Event`, `Place` (app also accepts lowercase) |
| `Title` | Single line text | Required |
| `Description` | Long text | Optional |
| `Category` | Single select | `food`, `nightlife`, `nature`, `culture`, `shopping`, `sports`, `kids`, `art`, `music`, `education`, `other` |
| `Lat` / `Lng` | Number | Optional coordinates |
| `LocationText` | Single line text | Fallback / TBD |
| `SourceURL` | URL | Optional |
| `Description` | Long text | Optional; may include `Contact: …` / `Time: …` metadata lines |
| `EventDate` / `EventEndDate` | Date | Events only |
| `Status` | Single select | `pending` (default), `approved`, `rejected` |

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How testers use it

1. Browse the list + map; filter by All / Events / Places, category, and date
2. Click a listing or map pin to sync selection
3. Use **Suggest** in the header to submit a place or event (saved as `pending`)
4. You approve in Airtable → it appears on the live map after refresh

## Admin approval

1. Open the **Entries** table in Airtable
2. Filter `Status = pending`
3. Set `approved` or `rejected`
4. Approved rows show on the site (refresh)

## Deploy to Vercel (for user testing)

1. Push this repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add the same three env vars as in `.env.local` (Production + Preview)
4. Deploy — share the `*.vercel.app` URL with testers
5. In [Mapbox](https://account.mapbox.com/access-tokens/), allow your Vercel domain on the public token (URL restrictions), or testers may see a blank map

```bash
npm run build   # sanity-check locally before deploy
```

Airtable credentials stay server-side; only `NEXT_PUBLIC_MAPBOX_TOKEN` is exposed to the browser.

## API

- `GET /api/entries` — approved entries
- `POST /api/entries` — create pending entry (honeypot field: `website`)
