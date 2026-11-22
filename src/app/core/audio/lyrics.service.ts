import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { LocalMusicTrack } from './local-music-library';
export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface TrackLyrics {
  trackId: string;
  isSynced: boolean;
  lines: LyricLine[];
  plainText?: string;
}

interface LrclibResponse {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string;
  plainLyrics?: string;
}

function cleanTrackMetadata(
  rawTitle: string,
  rawArtist?: string,
): { title: string; artist: string } {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();

  // Strip file extensions
  title = title.replace(/\.(mp3|flac|m4a|wav|aac|ogg|wma|opus|aiff)$/i, '');

  // Strip leading track numbers like "01 - ", "01. ", "01_ ", "1-01 "
  title = title.replace(/^(\d+[-_.\s]+)+/i, '');

  // If title has "Artist - Title" format and artist is unknown or generic
  if (
    title.includes(' - ') &&
    (!artist || artist === 'Artiste inconnu' || artist === '<unknown>')
  ) {
    const parts = title.split(' - ');
    if (parts.length >= 2) {
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }
  }

  // Strip common noisy suffixes from title
  title = title.replace(
    /\s*[([](official\s*(video|audio|music\s*video|lyric\s*video)?|lyrics?|clip\s*officiel|paroles|remaster(ed)?\s*(\d{4})?|deluxe(\s*edition)?|radio\s*edit|extended|bonus\s*track)[^\])]*[\])]/gi,
    '',
  );

  // Strip "feat." or "ft."
  title = title.replace(/\s+(feat\.?|ft\.?)\s+.*$/i, '');

  if (artist === '<unknown>') artist = 'Artiste inconnu';

  return { title: title.trim(), artist: artist.trim() };
}

@Injectable({ providedIn: 'root' })
export class LyricsService {
  private readonly lyricsCache = new Map<string, TrackLyrics>();
  private readonly inFlight = new Set<string>();

  readonly currentLyrics = signal<TrackLyrics | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly lastError = signal<string | null>(null);

  private async persistCache(trackId: string, lyrics: TrackLyrics): Promise<void> {
    try {
      await Preferences.set({
        key: `hear_lyrics_${trackId}`,
        value: JSON.stringify(lyrics),
      });
    } catch {
      void 0;
    }
  }

  private async loadPersistedCache(trackId: string): Promise<TrackLyrics | null> {
    try {
      const { value } = await Preferences.get({ key: `hear_lyrics_${trackId}` });
      if (value) {
        const parsed = JSON.parse(value) as TrackLyrics;
        if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
          return parsed;
        }
      }
    } catch {
      void 0;
    }
    return null;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs = 6000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async loadLyricsForTrack(
    track: LocalMusicTrack | undefined | null,
    forceRefresh = false,
  ): Promise<TrackLyrics | null> {
    if (!track) {
      this.currentLyrics.set(null);
      this.lastError.set(null);
      return null;
    }

    if (!forceRefresh) {
      const cached = this.lyricsCache.get(track.id);
      if (cached && cached.lines.length > 0) {
        this.currentLyrics.set(cached);
        this.lastError.set(null);
        return cached;
      }
      const persisted = await this.loadPersistedCache(track.id);
      if (persisted) {
        this.lyricsCache.set(track.id, persisted);
        this.currentLyrics.set(persisted);
        this.lastError.set(null);
        return persisted;
      }
    }

    if (this.inFlight.has(track.id)) return null;
    this.inFlight.add(track.id);
    this.isLoading.set(true);
    this.lastError.set(null);

    try {
      const { title, artist } = cleanTrackMetadata(track.title, track.artist);
      if (!title || title === 'Titre sans nom') {
        const empty: TrackLyrics = { trackId: track.id, isSynced: false, lines: [] };
        this.currentLyrics.set(empty);
        return empty;
      }

      // Convert duration: on Android, duration is in milliseconds (> 10000)
      const rawDur = track.duration || 0;
      const targetDurationSec = rawDur > 10000 ? Math.round(rawDur / 1000) : Math.round(rawDur);

      const found = await this.fetchWithFallbacks(title, artist, targetDurationSec);
      if (found) {
        const parsed = this.parseLrc(track.id, found.syncedLyrics, found.plainLyrics);
        if (parsed.lines.length > 0) {
          this.lyricsCache.set(track.id, parsed);
          void this.persistCache(track.id, parsed);
          this.currentLyrics.set(parsed);
          return parsed;
        }
      }

      const empty: TrackLyrics = { trackId: track.id, isSynced: false, lines: [] };
      this.lyricsCache.set(track.id, empty);
      this.currentLyrics.set(empty);
      return empty;
    } catch (error) {
      this.lastError.set(
        error instanceof Error ? error.message : 'Connexion impossible au service de paroles.',
      );
      const empty: TrackLyrics = { trackId: track.id, isSynced: false, lines: [] };
      this.currentLyrics.set(empty);
      return empty;
    } finally {
      this.inFlight.delete(track.id);
      this.isLoading.set(false);
    }
  }

  async preloadLyricsForTrack(track: LocalMusicTrack | undefined | null): Promise<void> {
    if (!track) return;
    if (this.lyricsCache.has(track.id)) return;
    const persisted = await this.loadPersistedCache(track.id);
    if (persisted) {
      this.lyricsCache.set(track.id, persisted);
      return;
    }
    if (this.inFlight.has(track.id)) return;

    this.inFlight.add(track.id);
    try {
      const { title, artist } = cleanTrackMetadata(track.title, track.artist);
      if (!title || title === 'Titre sans nom') return;

      const rawDur = track.duration || 0;
      const targetDurationSec = rawDur > 10000 ? Math.round(rawDur / 1000) : Math.round(rawDur);

      const found = await this.fetchWithFallbacks(title, artist, targetDurationSec);
      if (found) {
        const parsed = this.parseLrc(track.id, found.syncedLyrics, found.plainLyrics);
        if (parsed.lines.length > 0) {
          this.lyricsCache.set(track.id, parsed);
          void this.persistCache(track.id, parsed);
        }
      }
    } catch {
      // Preload runs silently in background
    } finally {
      this.inFlight.delete(track.id);
    }
  }

  async searchCustom(trackId: string, customQuery: string): Promise<TrackLyrics | null> {
    const trimmed = customQuery.trim();
    if (!trimmed) return null;

    this.isLoading.set(true);
    this.lastError.set(null);

    try {
      const res = await this.fetchWithTimeout(
        `https://lrclib.net/api/search?q=${encodeURIComponent(trimmed)}`,
        {
          headers: { 'User-Agent': 'HearApp/0.3' },
        },
      );
      if (res.ok) {
        const list = (await res.json()) as LrclibResponse[];
        const best = this.selectBestResult(list);
        if (best) {
          const parsed = this.parseLrc(trackId, best.syncedLyrics, best.plainLyrics);
          if (parsed.lines.length > 0) {
            this.lyricsCache.set(trackId, parsed);
            void this.persistCache(trackId, parsed);
            this.currentLyrics.set(parsed);
            return parsed;
          }
        }
      }
      return null;
    } catch (error) {
      this.lastError.set(
        error instanceof Error ? error.message : 'Échec de la recherche manuelle.',
      );
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchWithFallbacks(
    title: string,
    artist: string,
    targetDurationSec?: number,
  ): Promise<LrclibResponse | null> {
    const hasValidArtist = artist && artist !== 'Artiste inconnu' && artist !== '<unknown>';

    // Tier 1: Exact search with track_name and artist_name
    if (hasValidArtist) {
      try {
        const getParams = new URLSearchParams({ track_name: title, artist_name: artist });
        const res = await this.fetchWithTimeout(
          `https://lrclib.net/api/get?${getParams.toString()}`,
          { headers: { 'User-Agent': 'HearApp/0.3' } },
        );
        if (res.ok) {
          const data = (await res.json()) as LrclibResponse;
          if (data.syncedLyrics || data.plainLyrics) return data;
        }
      } catch {
        // Continue to search fallbacks
      }
    }

    // Tier 2: Search with track_name and optional artist_name
    try {
      const searchParams = new URLSearchParams({ track_name: title });
      if (hasValidArtist) searchParams.set('artist_name', artist);
      const res2 = await this.fetchWithTimeout(
        `https://lrclib.net/api/search?${searchParams.toString()}`,
        { headers: { 'User-Agent': 'HearApp/0.3' } },
      );
      if (res2.ok) {
        const list = (await res2.json()) as LrclibResponse[];
        const best = this.selectBestResult(list, targetDurationSec);
        if (best) return best;
      }
    } catch {
      // Continue to next tier
    }

    // Tier 3: General query "Artist Title"
    try {
      const q = `${hasValidArtist ? artist + ' ' : ''}${title}`.trim();
      const res3 = await this.fetchWithTimeout(
        `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': 'HearApp/0.3' } },
      );
      if (res3.ok) {
        const list = (await res3.json()) as LrclibResponse[];
        const best = this.selectBestResult(list, targetDurationSec);
        if (best) return best;
      }
    } catch {
      // Continue to next tier
    }

    // Tier 4: Search by title only if artist was present but perhaps mismatched
    if (hasValidArtist) {
      try {
        const res4 = await this.fetchWithTimeout(
          `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}`,
          { headers: { 'User-Agent': 'HearApp/0.3' } },
        );
        if (res4.ok) {
          const list = (await res4.json()) as LrclibResponse[];
          const best = this.selectBestResult(list, targetDurationSec);
          if (best) return best;
        }
      } catch {
        // Fallback exhausted
      }
    }

    return null;
  }

  private selectBestResult(
    list: LrclibResponse[],
    targetDurationSec?: number,
  ): LrclibResponse | null {
    if (!list || list.length === 0) return null;

    // Filter to only items with lyrics
    const candidates = list.filter(
      (item) =>
        (item.syncedLyrics && item.syncedLyrics.trim().length > 0) ||
        (item.plainLyrics && item.plainLyrics.trim().length > 0),
    );
    if (candidates.length === 0) return null;

    // Prefer synced lyrics
    const synced = candidates.filter(
      (item) => item.syncedLyrics && item.syncedLyrics.trim().length > 0,
    );
    const pool = synced.length > 0 ? synced : candidates;

    // If target duration is known, find closest duration
    if (targetDurationSec && targetDurationSec > 0) {
      let closest = pool[0];
      let smallestDiff = Math.abs((closest.duration || 0) - targetDurationSec);
      for (const item of pool) {
        const diff = Math.abs((item.duration || 0) - targetDurationSec);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closest = item;
        }
      }
      return closest;
    }

    return pool[0];
  }

  private parseLrc(trackId: string, syncedLyrics?: string, plainLyrics?: string): TrackLyrics {
    if (syncedLyrics && syncedLyrics.trim()) {
      const lines: LyricLine[] = [];
      const regex = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\](.*)$/;
      for (const rawLine of syncedLyrics.split('\n')) {
        const trimmed = rawLine.trim();
        const match = trimmed.match(regex);
        if (match) {
          const minutes = Number.parseInt(match[1], 10);
          const seconds = Number.parseInt(match[2], 10);
          const fraction = match[3] ? Number.parseFloat(`0.${match[3]}`) : 0;
          const time = minutes * 60 + seconds + fraction;
          const text = match[4].trim();
          if (text) {
            lines.push({ time, text });
          }
        }
      }
      lines.sort((a, b) => a.time - b.time);
      if (lines.length > 0) {
        return { trackId, isSynced: true, lines, plainText: plainLyrics };
      }
    }

    if (plainLyrics && plainLyrics.trim()) {
      const lines: LyricLine[] = plainLyrics
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((text, i) => ({ time: i * 5, text }));
      return { trackId, isSynced: false, lines, plainText: plainLyrics };
    }

    return { trackId, isSynced: false, lines: [] };
  }
}
