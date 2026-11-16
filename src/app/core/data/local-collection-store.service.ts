import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const FAVORITES_KEY = 'collection-favorites';
const HISTORY_KEY = 'collection-history';
const PLAYLISTS_KEY = 'collection-playlists';

export interface HearPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class LocalCollectionStore {
  async listPlaylists(): Promise<HearPlaylist[]> {
    const playlists = await this.read<HearPlaylist[]>(PLAYLISTS_KEY, []);
    return playlists.sort((first, second) => second.updatedAt - first.updatedAt);
  }

  async createPlaylist(name: string): Promise<HearPlaylist> {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 60) {
      throw new Error('Le nom de la playlist doit contenir entre 1 et 60 caractères.');
    }
    const playlists = await this.listPlaylists();
    if (
      playlists.some(
        (playlist) =>
          playlist.name.toLocaleLowerCase('fr') === normalizedName.toLocaleLowerCase('fr'),
      )
    ) {
      throw new Error('Une playlist porte déjà ce nom.');
    }
    const playlist: HearPlaylist = {
      id: `playlist-${crypto.randomUUID()}`,
      name: normalizedName,
      trackIds: [],
      updatedAt: Date.now(),
    };
    playlists.push(playlist);
    await this.write(PLAYLISTS_KEY, playlists);
    return playlist;
  }

  async deletePlaylist(id: string): Promise<void> {
    const playlists = await this.listPlaylists();
    await this.write(
      PLAYLISTS_KEY,
      playlists.filter((playlist) => playlist.id !== id),
    );
  }

  async listPlaylistTrackIds(playlistId: string): Promise<string[]> {
    return (
      (await this.listPlaylists()).find((playlist) => playlist.id === playlistId)?.trackIds ?? []
    );
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    const playlists = await this.listPlaylists();
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist) throw new Error('Cette playlist n’existe plus.');
    if (!playlist.trackIds.includes(trackId)) playlist.trackIds.push(trackId);
    playlist.updatedAt = Date.now();
    await this.write(PLAYLISTS_KEY, playlists);
  }

  async listFavoriteTrackIds(): Promise<string[]> {
    return this.read<string[]>(FAVORITES_KEY, []);
  }

  async setFavorite(trackId: string, isFavorite: boolean): Promise<void> {
    const favorites = await this.listFavoriteTrackIds();
    const next = isFavorite
      ? [...favorites.filter((id) => id !== trackId), trackId]
      : favorites.filter((id) => id !== trackId);
    await this.write(FAVORITES_KEY, next);
  }

  async recordPlayed(trackId: string): Promise<void> {
    const history = await this.read<string[]>(HISTORY_KEY, []);
    await this.write(
      HISTORY_KEY,
      [trackId, ...history.filter((id) => id !== trackId)].slice(0, 100),
    );
  }

  async listHistoryTrackIds(): Promise<string[]> {
    return this.read<string[]>(HISTORY_KEY, []);
  }

  private async read<T>(key: string, fallback: T): Promise<T> {
    const { value } = await Preferences.get({ key });
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  private async write(key: string, value: unknown): Promise<void> {
    await Preferences.set({ key, value: JSON.stringify(value) });
  }
}
