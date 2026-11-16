import { Injectable, signal } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class LyricsService {
  private readonly lyricsCache = new Map<string, TrackLyrics>();
  private readonly inFlight = new Set<string>();

  readonly currentLyrics = signal<TrackLyrics | null>(null);
  readonly isLoading = signal<boolean>(false);

  async loadLyricsForTrack(track: LocalMusicTrack | undefined | null): Promise<TrackLyrics | null> {
    if (!track) {
      this.currentLyrics.set(null);
      return null;
    }

    const cached = this.lyricsCache.get(track.id);
    if (cached) {
      this.currentLyrics.set(cached);
      return cached;
    }

    if (this.inFlight.has(track.id)) return null;
    this.inFlight.add(track.id);
    this.isLoading.set(true);

    try {
      const cleanTitle = (track.title || '').trim();
      const cleanArtist = (track.artist || '').trim();
      if (!cleanTitle || cleanTitle === 'Titre sans nom') {
        const empty: TrackLyrics = { trackId: track.id, isSynced: false, lines: [] };
        this.lyricsCache.set(track.id, empty);
        this.currentLyrics.set(empty);
        return empty;
      }

      const params = new URLSearchParams({
        track_name: cleanTitle,
        artist_name: cleanArtist === 'Artiste inconnu' ? '' : cleanArtist,
      });
      if (track.album && track.album !== 'Album inconnu') {
        params.append('album_name', track.album);
      }
      if (track.duration && track.duration > 0) {
        params.append('duration', Math.round(track.duration).toString());
      }

      const response = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (!response.ok && response.status === 404) {
        // Fallback: search query
        const query =
          `${cleanArtist !== 'Artiste inconnu' ? cleanArtist + ' ' : ''}${cleanTitle}`.trim();
        const searchRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
        );
        if (searchRes.ok) {
          const list = (await searchRes.json()) as {
            syncedLyrics?: string;
            plainLyrics?: string;
          }[];
          const best = list.find((item) => item.syncedLyrics) || list[0];
          if (best) {
            const parsed = this.parseLrc(track.id, best.syncedLyrics, best.plainLyrics);
            this.lyricsCache.set(track.id, parsed);
            this.currentLyrics.set(parsed);
            return parsed;
          }
        }
      } else if (response.ok) {
        const data = (await response.json()) as {
          syncedLyrics?: string;
          plainLyrics?: string;
        };
        const parsed = this.parseLrc(track.id, data.syncedLyrics, data.plainLyrics);
        this.lyricsCache.set(track.id, parsed);
        this.currentLyrics.set(parsed);
        return parsed;
      }

      const empty: TrackLyrics = { trackId: track.id, isSynced: false, lines: [] };
      this.lyricsCache.set(track.id, empty);
      this.currentLyrics.set(empty);
      return empty;
    } catch {
      const empty: TrackLyrics = { trackId: track.id, isSynced: false, lines: [] };
      this.lyricsCache.set(track.id, empty);
      this.currentLyrics.set(empty);
      return empty;
    } finally {
      this.inFlight.delete(track.id);
      this.isLoading.set(false);
    }
  }

  private parseLrc(trackId: string, syncedLyrics?: string, plainLyrics?: string): TrackLyrics {
    if (syncedLyrics && syncedLyrics.trim()) {
      const lines: LyricLine[] = [];
      const regex = /^\[(\d{2}):(\d{2}(?:\.\d+)?)\](.*)$/;
      for (const rawLine of syncedLyrics.split('\n')) {
        const match = rawLine.trim().match(regex);
        if (match) {
          const minutes = Number.parseInt(match[1], 10);
          const seconds = Number.parseFloat(match[2]);
          const time = minutes * 60 + seconds;
          const text = match[3].trim();
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
