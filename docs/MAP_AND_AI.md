# Map (P1) + AI (P2) — free-tier practical architecture

## Map stack (implemented foundation)

| Concern | Choice | Status |
|---------|--------|--------|
| Display | MapLibre GL + OpenFreeMap style | UI `MapPreview` |
| Tiles | OpenFreeMap (or `VITE_MAP_STYLE_URL` / later PMTiles on R2) | Configurable |
| Geocode/route | Geoapify Free via `geoapify-proxy` Edge Function | Optional `GEOAPIFY_API_KEY` |
| Nearby / match | PostGIS `geography` + `suggest_trips_for_booking` | Deterministic only |
| Navigation | Google Maps URL | Existing buttons |

**Not used:** public OSM tile hammering, browser Nominatim at scale, LLM for matching.

### PostGIS

Migration `20260324140000_postgis_map_ai.sql`:

- `bookings.pickup_location` / `dropoff_location` geography(Point,4326)
- `routes.route_path` geography(LineString,4326)
- GiST indexes
- Auto-fill from lat/lng columns

### Matching hard rules

`suggest_trips_for_booking` requires:

- same `pickup_date`
- seats ≥ passengers
- luggage capacity
- operator **verified**
- driver/vehicle verified if assigned
- optional distance filter via `ST_DWithin` / `ST_Distance`

Dispatcher confirms — no auto-assign.

### PMTiles + R2 (next step, not bundled)

1. Build clipped Japan basemap PMTiles (reduce zoom/layers for free R2).
2. Upload to R2 bucket, public read or signed.
3. Set `VITE_MAP_STYLE_URL` to a style referencing that archive.

## AI stack (scaffold — safe defaults)

| Feature | Mode | Rule |
|---------|------|------|
| FAQ assistant | Keyword/FTS on **approved** `content_chunks` | Citations; no legal/price/license claims |
| NL booking | **Heuristic** parser → form draft | User must confirm submit |
| Message draft | Flag off | Staff review → send only |
| OCR | Flag off / browser-only planned | Candidates for reviewer, never auto-verify |
| Gemini Free | **Disabled** | Never send PII/docs |

pgvector column on `content_chunks` ready for embeddings worker later (Workers AI). Retrieval today uses `search_content_chunks` full-text/ILIKE — no third-party LLM required.

## Feature flags

`site_settings` keys: `features.maplibre`, `features.geoapify`, `features.ai_*`, `features.gemini`.

## $0 reality check

Suitable for **closed beta**. Free Supabase may pause; dump DB with `scripts/backup-db.ps1`. No long-term SLA claim.

## Secrets

```bash
npx supabase secrets set GEOAPIFY_API_KEY=...
npx supabase functions deploy geoapify-proxy --no-verify-jwt
```
