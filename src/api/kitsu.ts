/**
 * Kitsu Public Edge API — Centralized Service
 * =============================================
 * All Kitsu data flows through this module.
 *
 * Endpoints used:
 *   Top anime:   GET /api/edge/anime?page[limit]=20&sort=-userCount
 *   Search:      GET /api/edge/anime?filter[text]=<query>&page[limit]=20
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KitsuAnimeAttributes {
  canonicalTitle?: string;
  titles?: {
    en?: string;
    en_jp?: string;
    en_us?: string;
    ja_jp?: string;
  };
  synopsis?: string;
  description?: string;
  coverImage?: {
    tiny?: string;
    small?: string;
    large?: string;
    original?: string;
  } | null;
  posterImage?: {
    tiny?: string;
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
  } | null;
  startDate?: string;
  endDate?: string;
  averageRating?: string;
  userCount?: number;
  favoritesCount?: number;
  status?: string;
  subtype?: string;
  ageRating?: string;
  ageRatingGuide?: string;
  episodeCount?: number;
  episodeLength?: number;
  showType?: string;
}

export interface KitsuAnimeResource {
  id: string;
  type: 'anime';
  attributes: KitsuAnimeAttributes;
}

export interface KitsuResponse {
  data: KitsuAnimeResource[];
  meta?: { count?: number };
  links?: { first?: string; next?: string; last?: string };
}

// ─── Normalized shape used by all components ──────────────────────────────────

export interface NormalizedAnime {
  id: string;
  title: string;              // canonicalTitle or best fallback
  englishTitle: string;        // titles.en or en_jp
  jpTitle: string;             // titles.ja_jp
  synopsis: string;            // synopsis text
  posterImage: string;         // best poster (portrait)
  coverImage: string;          // best cover  (landscape)
  year: number;                // parsed from startDate
  score: number;               // averageRating rounded to int
  episodes: number;            // episodeCount
  status: string;              // e.g. "FINISHED"
  subtype: string;             // e.g. "TV"
  ageRating: string;           // e.g. "R"
  tags: string[];              // [subtype, status, ageRating]
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const BASE_URL = 'https://kitsu.io/api/edge';

function pickBestImage(
  images: KitsuAnimeAttributes['posterImage'] | KitsuAnimeAttributes['coverImage'],
): string {
  if (!images) return '';
  return images.original || images.large || images.small || images.tiny || '';
}

function parseYear(startDate?: string): number {
  if (!startDate) return 0;
  const n = Number(startDate.slice(0, 4));
  return Number.isNaN(n) ? 0 : n;
}

function formatTag(value?: string): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').toUpperCase();
}

function normalize(item: KitsuAnimeResource): NormalizedAnime {
  const a = item.attributes;

  const title = a.canonicalTitle || a.titles?.en || a.titles?.en_jp || 'UNTITLED';
  const englishTitle = a.titles?.en || a.titles?.en_us || a.titles?.en_jp || title;
  const jpTitle = a.titles?.ja_jp || a.titles?.en_jp || '';

  const posterImage = pickBestImage(a.posterImage);
  const coverImage = pickBestImage(a.coverImage);

  const tags = [a.subtype, a.status, a.ageRating]
    .filter((t): t is string => Boolean(t))
    .map(formatTag)
    .slice(0, 3);

  return {
    id: item.id,
    title,
    englishTitle,
    jpTitle,
    synopsis: a.synopsis || a.description || '',
    posterImage,
    coverImage,
    year: parseYear(a.startDate),
    score: Math.round(Number(a.averageRating)) || 0,
    episodes: a.episodeCount || 0,
    status: formatTag(a.status) || 'UNKNOWN',
    subtype: formatTag(a.subtype) || '',
    ageRating: formatTag(a.ageRating) || '',
    tags,
  };
}

// ─── Cache for the top-anime list ─────────────────────────────────────────────

let _topAnimeCache: NormalizedAnime[] | null = null;
let _topAnimePromise: Promise<NormalizedAnime[]> | null = null;

/**
 * Fetch the top 20 anime by user count.
 * Cached across the session so every component gets the same list
 * without duplicate network requests.
 */
export function fetchTopAnime(): Promise<NormalizedAnime[]> {
  if (_topAnimeCache) return Promise.resolve(_topAnimeCache);
  if (_topAnimePromise) return _topAnimePromise;

  _topAnimePromise = (async () => {
    try {
      const url = `${BASE_URL}/anime?page[limit]=20&sort=-userCount`;
      const res = await fetch(url, {
        headers: { Accept: 'application/vnd.api+json' },
      });

      if (!res.ok) {
        console.error('[kitsu] Top anime request failed', res.status);
        return [];
      }

      const json: KitsuResponse = await res.json();
      const list = (json.data || []).map(normalize);
      _topAnimeCache = list;
      return list;
    } catch (err) {
      console.error('[kitsu] Top anime fetch error', err);
      return [];
    } finally {
      _topAnimePromise = null;
    }
  })();

  return _topAnimePromise;
}

/**
 * Search Kitsu for anime matching a text query.
 * Uses Kitsu's built-in full-text search filter.
 */
export async function searchAnime(query: string): Promise<NormalizedAnime[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `${BASE_URL}/anime?filter[text]=${encodeURIComponent(trimmed)}&page[limit]=20`;
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.api+json' },
    });

    if (!res.ok) {
      console.error('[kitsu] Search request failed', res.status);
      return [];
    }

    const json: KitsuResponse = await res.json();
    return (json.data || []).map(normalize);
  } catch (err) {
    console.error('[kitsu] Search fetch error', err);
    return [];
  }
}
