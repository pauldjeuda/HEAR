import { Injectable } from '@angular/core';
import { parseAudioFileMetadata } from './tag-parser';

const DATABASE_NAME = 'hear-local-audio';
const DATABASE_VERSION = 1;
const TRACK_STORE = 'tracks';
const AUDIO_EXTENSIONS = /\.(aac|aif|aiff|flac|m4a|mid|midi|mp3|oga|ogg|opus|wav)$/i;
const AUDIO_MIME_TYPES: Record<string, string> = {
  aac: 'audio/aac',
  aif: 'audio/aiff',
  aiff: 'audio/aiff',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  mid: 'audio/midi',
  midi: 'audio/midi',
  mp3: 'audio/mpeg',
  oga: 'audio/ogg',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
};

export interface LocalMusicTrack {
  id: string;
  uri?: string;
  title: string;
  artist?: string;
  album?: string;
  albumId?: string;
  duration?: number;
  mimeType: string;
  size: number;
  addedAt: number;
  modifiedAt?: number;
  file?: Blob;
  artworkUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class LocalMusicLibrary {
  private databasePromise?: Promise<IDBDatabase>;

  async list(): Promise<LocalMusicTrack[]> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database
        .transaction(TRACK_STORE, 'readonly')
        .objectStore(TRACK_STORE)
        .getAll();
      request.onsuccess = () => {
        const tracks = request.result as LocalMusicTrack[];
        resolve(tracks.sort((first, second) => second.addedAt - first.addedAt));
      };
      request.onerror = () =>
        reject(request.error ?? new Error('Impossible de lire la bibliothèque locale.'));
    });
  }

  async add(files: File[]): Promise<LocalMusicTrack[]> {
    const audioFiles = files.filter(
      (file) => file.type.startsWith('audio/') || AUDIO_EXTENSIONS.test(file.name),
    );
    if (audioFiles.length === 0) {
      throw new Error('Sélectionnez un fichier audio pris en charge.');
    }

    const totalSize = audioFiles.reduce((sum, file) => sum + file.size, 0);
    if (navigator.storage?.estimate) {
      const { quota, usage } = await navigator.storage.estimate();
      if (quota && usage !== undefined && totalSize > quota - usage) {
        throw new Error(
          'Il ne reste pas assez d’espace disponible pour copier ces fichiers dans Hear.',
        );
      }
      await navigator.storage.persist?.();
    }

    const now = Date.now();
    const tracks: LocalMusicTrack[] = await Promise.all(
      audioFiles.map(async (file) => {
        const extension = file.name.match(/\.([^./\\]+)$/)?.[1]?.toLowerCase() ?? '';
        const mimeType = file.type.startsWith('audio/')
          ? file.type
          : (AUDIO_MIME_TYPES[extension] ?? file.type ?? 'application/octet-stream');

        const metadata = await parseAudioFileMetadata(file);
        const fallbackTitle = file.name.replace(/\.[^./\\]+$/, '') || file.name;

        return {
          id: `local-${crypto.randomUUID()}`,
          uri: '',
          title: metadata.title || fallbackTitle,
          artist: metadata.artist || 'Artiste inconnu',
          album: metadata.album || 'Album inconnu',
          duration: 0,
          mimeType,
          size: file.size,
          addedAt: now,
          modifiedAt: file.lastModified,
          file: file.slice(0, file.size, mimeType),
          artworkUrl: metadata.artworkUrl,
        };
      }),
    );
    const database = await this.open();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(TRACK_STORE, 'readwrite');
      const store = transaction.objectStore(TRACK_STORE);
      for (const track of tracks) store.add(track);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Impossible d’enregistrer les fichiers audio.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('L’import audio a été interrompu.'));
    });

    return tracks;
  }

  async remove(id: string): Promise<void> {
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(TRACK_STORE, 'readwrite');
      transaction.objectStore(TRACK_STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Impossible de supprimer le fichier audio.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('La suppression audio a été interrompue.'));
    });
  }

  private open(): Promise<IDBDatabase> {
    if (!globalThis.indexedDB) {
      return Promise.reject(
        new Error('La bibliothèque locale n’est pas disponible sur cet appareil.'),
      );
    }
    const databasePromise = (this.databasePromise ??= new Promise<IDBDatabase>(
      (resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(TRACK_STORE)) {
            request.result.createObjectStore(TRACK_STORE, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        };
        request.onerror = () =>
          reject(request.error ?? new Error('Impossible d’ouvrir la bibliothèque locale.'));
      },
    ).catch((error: unknown) => {
      this.databasePromise = undefined;
      throw error;
    }));
    return databasePromise;
  }
}
