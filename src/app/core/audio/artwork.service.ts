import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalMusicBridge } from './local-music-bridge';
import type { LocalMusicTrack } from './local-music-library';
import { parseAudioFileMetadata } from './tag-parser';

@Injectable({ providedIn: 'root' })
export class ArtworkService {
  private readonly cache = signal<Record<string, string | null>>({});
  private readonly inFlight = new Set<string>();

  getArtwork(track: LocalMusicTrack | undefined | null): string | null {
    if (!track) return null;
    if (track.artworkUrl) return track.artworkUrl;

    const cached = this.cache()[track.id];
    if (cached !== undefined) return cached;

    this.resolveArtwork(track);
    return null;
  }

  private async resolveArtwork(track: LocalMusicTrack): Promise<void> {
    if (this.inFlight.has(track.id)) return;
    this.inFlight.add(track.id);

    try {
      if (Capacitor.isNativePlatform() && track.uri) {
        const res = await LocalMusicBridge.getArtwork({
          uri: track.uri,
          albumId: track.albumId,
        });
        this.cache.update((state) => ({ ...state, [track.id]: res.artwork ?? null }));
      } else if (track.file) {
        const meta = await parseAudioFileMetadata(track.file);
        const url = meta.artworkUrl ?? null;
        this.cache.update((state) => ({ ...state, [track.id]: url }));
      } else {
        this.cache.update((state) => ({ ...state, [track.id]: null }));
      }
    } catch {
      this.cache.update((state) => ({ ...state, [track.id]: null }));
    } finally {
      this.inFlight.delete(track.id);
    }
  }
}
