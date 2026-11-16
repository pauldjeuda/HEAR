import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { IonApp } from '@ionic/angular/standalone';
import { ArtworkService } from './core/audio/artwork.service';
import type { AudioState } from './core/audio/audio-engine';
import { LyricsService } from './core/audio/lyrics.service';
import { LocalMusicLibrary, type LocalMusicTrack } from './core/audio/local-music-library';
import {
  LocalMusicBridge,
  type DeviceMusicTrack,
  type PlaybackStateEvent,
} from './core/audio/local-music-bridge';
import { generateTrackWaveform } from './core/audio/waveform.utils';
import { WebAudioEngine } from './core/audio/web-audio.engine';
import {
  LocalCollectionStore,
  type HearPlaylist,
} from './core/data/local-collection-store.service';

type HearScreen =
  | 'home'
  | 'menu'
  | 'search'
  | 'artists'
  | 'artist'
  | 'collection'
  | 'offline'
  | 'settings'
  | 'player'
  | 'lyrics';
type CollectionFilter = 'tracks' | 'favorites' | 'playlists' | 'history' | 'playlistTracks';
type ThemeMode = 'paper' | 'vinyl' | 'system';
type RepeatMode = 'none' | 'one' | 'all';
type PlayableLocalTrack = LocalMusicTrack & { url: string };

@Component({
  imports: [IonApp],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  protected readonly appVersion = '0.2.1';
  protected readonly Math = Math;
  @ViewChild('appScreen') private appScreen?: ElementRef<HTMLElement>;
  private readonly collectionStore = inject(LocalCollectionStore);
  private readonly localMusic = inject(LocalMusicLibrary);
  protected readonly artworkService = inject(ArtworkService);
  protected readonly lyricsService = inject(LyricsService);
  private readonly audioEngine = new WebAudioEngine();
  private readonly navigationHistory: HearScreen[] = [];
  private playlistLoadVersion = 0;
  private nativePlaybackListener?: PluginListenerHandle;

  protected readonly activeScreen = signal<HearScreen>('home');
  protected readonly collectionFilter = signal<CollectionFilter>('tracks');
  protected readonly collectionStoreReady = signal(true);
  protected readonly playlists = signal<HearPlaylist[]>([]);
  protected readonly activePlaylistId = signal<string | null>(null);
  protected readonly playlistTrackIds = signal<string[]>([]);
  protected readonly isCreatingPlaylist = signal(false);
  protected readonly playlistName = signal('');
  protected readonly playlistMessage = signal('');
  protected readonly localTracks = signal<PlayableLocalTrack[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly selectedArtist = signal('');
  protected readonly playlistPickerTrackId = signal<string | null>(null);
  protected readonly activeLocalTrackId = signal<string | null>(null);
  protected readonly playbackState = signal<AudioState>('idle');
  protected readonly playbackPosition = signal(0);
  protected readonly playbackDuration = signal(0);
  protected readonly permissionGranted = signal<boolean | null>(null);
  protected readonly isScanning = signal(false);
  protected readonly scanCompletedAt = signal<number | null>(null);
  protected readonly localMusicMessage = signal(
    'Hear indexe uniquement les fichiers audio de ce téléphone.',
  );
  protected readonly favoriteTrackIds = signal<string[]>([]);
  protected readonly historyTrackIds = signal<string[]>([]);
  protected readonly autoScan = signal(true);
  protected readonly theme = signal<ThemeMode>('paper');
  protected readonly repeatMode = signal<RepeatMode>('none');
  protected readonly shuffleEnabled = signal(false);
  protected readonly playbackQueue = signal<PlayableLocalTrack[]>([]);
  protected readonly isScrubbing = signal(false);
  protected readonly scrubPosition = signal(0);
  protected readonly isAndroid = Capacitor.getPlatform() === 'android';

  protected readonly activeLocalTrack = computed(
    () => this.localTracks().find((track) => track.id === this.activeLocalTrackId()) ?? null,
  );
  protected readonly waveformBars = computed(() => {
    const track = this.activeLocalTrack();
    const seed = track ? `${track.id}-${track.title}-${track.duration}` : 'default';
    return generateTrackWaveform(seed, 44);
  });
  protected readonly progressRatio = computed(() => {
    const dur = this.playbackDuration();
    if (!dur || dur <= 0) return 0;
    const current = this.isScrubbing() ? this.scrubPosition() : this.playbackPosition();
    return Math.min(1, Math.max(0, current / dur));
  });
  protected readonly currentLyricIndex = computed(() => {
    const lyrics = this.lyricsService.currentLyrics();
    if (!lyrics || !lyrics.isSynced || lyrics.lines.length === 0) return -1;
    const pos = this.playbackPosition();
    const lines = lyrics.lines;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (pos >= lines[i].time) {
        return i;
      }
    }
    return 0;
  });
  protected readonly artists = computed(() => {
    const names = this.localTracks()
      .map((track) => track.artist?.trim() || 'Artiste inconnu')
      .filter((name) => name !== 'Artiste inconnu');
    return [...new Set(names)].sort((first, second) => first.localeCompare(second, 'fr'));
  });
  protected readonly filteredTracks = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase('fr');
    if (!query) return this.localTracks();
    return this.localTracks().filter((track) =>
      [track.title, track.artist, track.album]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('fr').includes(query)),
    );
  });
  protected readonly collectionTracks = computed(() => {
    const tracks = this.localTracks();
    switch (this.collectionFilter()) {
      case 'favorites':
        return this.favoriteTrackIds()
          .map((id) => tracks.find((track) => track.id === id))
          .filter((track): track is PlayableLocalTrack => track !== undefined);
      case 'history':
        return this.historyTrackIds()
          .map((id) => tracks.find((track) => track.id === id))
          .filter((track): track is PlayableLocalTrack => track !== undefined);
      case 'playlistTracks':
        return this.playlistTrackIds()
          .map((id) => tracks.find((track) => track.id === id))
          .filter((track): track is PlayableLocalTrack => track !== undefined);
      default:
        return tracks;
    }
  });
  protected readonly totalLibraryBytes = computed(() =>
    this.localTracks().reduce((total, track) => total + track.size, 0),
  );
  protected readonly selectedArtistTracks = computed(() =>
    this.localTracks().filter((track) => track.artist === this.selectedArtist()),
  );
  protected readonly latestTrack = computed(() => {
    const recentId = this.historyTrackIds()[0];
    return (
      this.localTracks().find((track) => track.id === recentId) ??
      [...this.localTracks()].sort(
        (first, second) =>
          (second.modifiedAt ?? second.addedAt) - (first.modifiedAt ?? first.addedAt),
      )[0] ??
      null
    );
  });

  private readonly audioEvents = this.audioEngine.events.subscribe((event) => {
    if (event.type === 'state') this.playbackState.set(event.state);
    if (event.type === 'position') {
      if (!this.isScrubbing()) {
        this.playbackPosition.set(event.position);
      }
      this.playbackDuration.set(event.duration);
    }
    if (event.type === 'ended') void this.playNextLocalTrack();
    if (event.type === 'error') this.localMusicMessage.set(event.message);
    if (event.type === 'remoteCommand') void this.handleRemoteCommand(event.command);
  });

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => undefined);
      void CapacitorApp.addListener('backButton', () => this.handleBack());
      void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive && this.autoScan()) void this.scanDeviceMusic(false);
      });
    }
    void this.initialize();
    void this.loadPlaylists();
    if (this.isAndroid) {
      void LocalMusicBridge.addListener('playbackState', (event) =>
        this.handleNativePlayback(event),
      )
        .then((listener) => (this.nativePlaybackListener = listener))
        .catch(() => undefined);
    }
    effect(() => {
      const idx = this.currentLyricIndex();
      if (this.activeScreen() === 'lyrics' && idx >= 0) {
        const el = document.getElementById(`lyric-line-${idx}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  ngOnDestroy(): void {
    this.audioEvents.unsubscribe();
    void this.nativePlaybackListener?.remove();
  }

  protected navigate(screen: HearScreen): void {
    if (screen !== this.activeScreen()) this.navigationHistory.push(this.activeScreen());
    this.activeScreen.set(screen);
    this.scrollScreenToTop();
    if (screen === 'collection') void this.refreshCollection();
  }

  protected goBack(): void {
    this.handleBack();
  }

  protected handleBack(): void {
    if (this.isCreatingPlaylist()) {
      this.isCreatingPlaylist.set(false);
      return;
    }
    const previous = this.navigationHistory.pop();
    if (previous) this.activeScreen.set(previous);
    else if (this.activeScreen() !== 'home') this.activeScreen.set('home');
    else if (this.isAndroid) void CapacitorApp.exitApp();
    this.scrollScreenToTop();
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    if (!Capacitor.isNativePlatform()) this.handleBack();
  }

  @HostListener('document:keydown.alt.arrowleft')
  protected handleBrowserBackKey(): void {
    this.handleBack();
  }

  protected toggleMenu(): void {
    this.navigate('menu');
  }

  protected async scanDeviceMusic(requestPermission: boolean): Promise<void> {
    if (this.isScanning()) return;
    this.isScanning.set(true);
    this.localMusicMessage.set('Analyse des fichiers audio du téléphone…');
    try {
      if (this.isAndroid) {
        const access = requestPermission
          ? await LocalMusicBridge.requestAccess()
          : await LocalMusicBridge.hasAccess();
        this.permissionGranted.set(access.granted);
        if (!access.granted) {
          this.localMusicMessage.set(
            'Autorisez Hear à lire les fichiers audio pour indexer votre musique.',
          );
          return;
        }
        const result = await LocalMusicBridge.scan();
        this.localTracks.set(result.tracks.map((track) => this.fromDeviceTrack(track)));
        this.scanCompletedAt.set(result.scannedAt);
        this.localMusicMessage.set(
          result.tracks.length === 0
            ? 'Aucun fichier musical indexé sur ce téléphone.'
            : `${result.tracks.length} titre${result.tracks.length > 1 ? 's' : ''} local${result.tracks.length > 1 ? 'isés' : 'isé'}.`,
        );
      } else {
        const tracks = await this.localMusic.list();
        this.localTracks.set(tracks.map((track) => this.fromBrowserTrack(track)));
        this.permissionGranted.set(true);
        this.scanCompletedAt.set(Date.now());
        this.localMusicMessage.set(
          tracks.length
            ? `${tracks.length} fichier${tracks.length > 1 ? 's' : ''} dans cette bibliothèque.`
            : 'Votre bibliothèque locale est vide.',
        );
      }
      await this.refreshCollection();
    } catch (error) {
      this.localMusicMessage.set(
        error instanceof Error
          ? error.message
          : 'La bibliothèque musicale n’a pas pu être analysée.',
      );
    } finally {
      this.isScanning.set(false);
    }
  }

  protected async importBrowserFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.isScanning.set(true);
    try {
      const added = await this.localMusic.add(files);
      const tracks = await this.localMusic.list();
      this.localTracks.set(tracks.map((track) => this.fromBrowserTrack(track)));
      this.scanCompletedAt.set(Date.now());
      this.localMusicMessage.set(
        `${added.length} fichier${added.length > 1 ? 's' : ''} ajouté${added.length > 1 ? 's' : ''} à l’aperçu navigateur.`,
      );
      await this.refreshCollection();
    } catch (error) {
      this.localMusicMessage.set(
        error instanceof Error ? error.message : 'Impossible de lire ces fichiers audio.',
      );
    } finally {
      this.isScanning.set(false);
    }
  }

  protected setCollectionFilter(filter: CollectionFilter): void {
    this.collectionFilter.set(filter);
    this.activePlaylistId.set(null);
    this.playlistPickerTrackId.set(null);
    if (filter === 'playlists') void this.loadPlaylists();
  }

  protected async openPlaylist(playlist: HearPlaylist): Promise<void> {
    this.collectionFilter.set('playlistTracks');
    this.activePlaylistId.set(playlist.id);
    try {
      this.playlistTrackIds.set(await this.collectionStore.listPlaylistTrackIds(playlist.id));
    } catch {
      this.playlistTrackIds.set([]);
    }
  }

  protected async addTrackToPlaylist(playlist: HearPlaylist, trackId: string): Promise<void> {
    try {
      await this.collectionStore.addTrackToPlaylist(playlist.id, trackId);
      this.playlistPickerTrackId.set(null);
      this.playlistMessage.set(`Ajouté à « ${playlist.name} ».`);
      if (this.activePlaylistId() === playlist.id) await this.openPlaylist(playlist);
    } catch {
      this.playlistMessage.set('Impossible d’ajouter ce titre à la playlist.');
    }
  }

  protected async createPlaylist(): Promise<void> {
    const name = this.playlistName().trim();
    if (!name) {
      this.playlistMessage.set('Donnez un nom à la playlist.');
      return;
    }
    try {
      const playlist = await this.collectionStore.createPlaylist(name);
      this.playlistLoadVersion++;
      this.playlists.update((current) =>
        [...current.filter((item) => item.id !== playlist.id), playlist].sort(
          (first, second) => second.updatedAt - first.updatedAt,
        ),
      );
      this.collectionStoreReady.set(true);
      this.playlistName.set('');
      this.isCreatingPlaylist.set(false);
      this.playlistMessage.set('Playlist créée sur ce téléphone.');
    } catch {
      this.playlistMessage.set('La playlist n’a pas pu être enregistrée.');
    }
  }

  protected async deletePlaylist(id: string): Promise<void> {
    try {
      await this.collectionStore.deletePlaylist(id);
      this.playlistLoadVersion++;
      this.playlists.update((current) => current.filter((playlist) => playlist.id !== id));
      this.playlistMessage.set('Playlist supprimée.');
      if (this.activePlaylistId() === id) this.setCollectionFilter('playlists');
    } catch {
      this.playlistMessage.set('La playlist n’a pas pu être supprimée.');
    }
  }

  protected async toggleFavorite(track: PlayableLocalTrack): Promise<void> {
    const next = !this.favoriteTrackIds().includes(track.id);
    try {
      await this.collectionStore.setFavorite(track.id, next);
      this.favoriteTrackIds.update((ids) =>
        next
          ? [...ids.filter((id) => id !== track.id), track.id]
          : ids.filter((id) => id !== track.id),
      );
    } catch {
      this.localMusicMessage.set('Le favori n’a pas pu être enregistré.');
    }
  }

  protected isFavorite(track: PlayableLocalTrack): boolean {
    return this.favoriteTrackIds().includes(track.id);
  }

  protected artistTrackCount(artist: string): number {
    return this.localTracks().filter((track) => track.artist === artist).length;
  }

  protected playlistNameFor(id: string): string {
    return this.playlists().find((playlist) => playlist.id === id)?.name ?? 'PLAYLIST';
  }

  protected upcomingTracks(currentId: string): PlayableLocalTrack[] {
    const queue = this.playbackQueue().length ? this.playbackQueue() : this.localTracks();
    const currentIndex = queue.findIndex((track) => track.id === currentId);
    if (currentIndex >= 0) {
      const nextTracks = queue.slice(currentIndex + 1);
      if (this.repeatMode() === 'all' && nextTracks.length < 3) {
        const wrap = queue.slice(0, currentIndex);
        nextTracks.push(...wrap);
      }
      return nextTracks.slice(0, 3);
    }
    return queue.filter((track) => track.id !== currentId).slice(0, 3);
  }

  protected openArtist(artist: string): void {
    this.selectedArtist.set(artist);
    this.navigate('artist');
  }

  protected async playLocalTrack(track: PlayableLocalTrack): Promise<void> {
    void this.lyricsService.loadLyricsForTrack(track);

    const allTracks = this.localTracks();
    if (this.shuffleEnabled()) {
      const remaining = allTracks.filter((item) => item.id !== track.id);
      const shuffledOthers = [...remaining].sort(() => Math.random() - 0.5);
      this.playbackQueue.set([track, ...shuffledOthers]);
    } else {
      this.playbackQueue.set(allTracks);
    }

    const currentQueue = this.playbackQueue();
    const index = Math.max(
      0,
      currentQueue.findIndex((item) => item.id === track.id),
    );

    if (this.isAndroid) {
      if (this.activeLocalTrackId() === track.id && this.playbackState() === 'playing') {
        await LocalMusicBridge.toggle();
        return;
      }
      this.activeLocalTrackId.set(track.id);
      this.playbackState.set('loading');
      this.playbackPosition.set(0);
      this.playbackDuration.set((track.duration ?? 0) / 1000);
      this.navigate('player');
      try {
        await LocalMusicBridge.play({
          queue: currentQueue.map((item) => ({
            uri: item.uri ?? '',
            title: item.title,
            artist: item.artist ?? 'Artiste inconnu',
            album: item.album ?? 'Album inconnu',
          })),
          index,
          repeatMode: this.repeatMode(),
        });
        await this.collectionStore.recordPlayed(track.id);
        await this.refreshCollection();
      } catch (error) {
        this.playbackState.set('error');
        this.localMusicMessage.set(error instanceof Error ? error.message : 'La lecture a échoué.');
      }
      return;
    }

    if (this.activeLocalTrackId() === track.id && this.playbackState() === 'playing') {
      await this.audioEngine.pause();
      return;
    }
    try {
      if (this.activeLocalTrackId() === track.id && this.playbackState() === 'paused') {
        await this.audioEngine.play();
        return;
      }
      this.activeLocalTrackId.set(track.id);
      this.navigate('player');
      await this.audioEngine.load(
        { uri: track.url, isLocal: true },
        { id: track.id, title: track.title, artist: track.artist ?? 'Artiste inconnu' },
      );
      await this.audioEngine.play();
      await this.collectionStore.recordPlayed(track.id);
      await this.refreshCollection();
    } catch {
      this.playbackState.set('error');
      this.localMusicMessage.set('Ce format audio ne peut pas être lu dans le navigateur.');
    }
  }

  protected async togglePlayback(): Promise<void> {
    const track = this.activeLocalTrack();
    if (!track) return;
    if (this.isAndroid) await LocalMusicBridge.toggle();
    else if (this.playbackState() === 'playing') await this.audioEngine.pause();
    else await this.audioEngine.play();
  }

  protected async handleNextTrack(): Promise<void> {
    if (this.isAndroid) await LocalMusicBridge.next();
    else await this.playNextLocalTrack();
  }

  protected async handlePreviousTrack(): Promise<void> {
    if (this.isAndroid) {
      await LocalMusicBridge.previous();
      return;
    }
    const queue = this.playbackQueue().length ? this.playbackQueue() : this.localTracks();
    const currentIndex = queue.findIndex((track) => track.id === this.activeLocalTrackId());
    if (this.playbackPosition() > 3) {
      await this.seekToPosition(0);
    } else if (currentIndex > 0) {
      await this.playLocalTrack(queue[currentIndex - 1]);
    } else if (this.repeatMode() === 'all' && queue.length > 0) {
      await this.playLocalTrack(queue[queue.length - 1]);
    } else {
      await this.seekToPosition(0);
    }
  }

  protected async seekToPosition(position: number): Promise<void> {
    const safePos = Math.max(0, Math.min(this.playbackDuration() || 0, position));
    this.playbackPosition.set(safePos);
    if (this.isAndroid) await LocalMusicBridge.seek({ position: Math.round(safePos * 1000) });
    else await this.audioEngine.seek(safePos).catch(() => undefined);
  }

  protected onWaveformRangeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const pos = Number(input.value);
    this.isScrubbing.set(true);
    this.scrubPosition.set(pos);
  }

  protected async onWaveformRangeChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const pos = Number(input.value);
    this.isScrubbing.set(false);
    this.playbackPosition.set(pos);
    await this.seekToPosition(pos);
  }

  protected async playQueueTrack(track: PlayableLocalTrack): Promise<void> {
    const queue = this.playbackQueue().length ? this.playbackQueue() : this.localTracks();
    const index = queue.findIndex((item) => item.id === track.id);
    if (this.isAndroid && index >= 0) {
      this.activeLocalTrackId.set(track.id);
      this.playbackState.set('loading');
      this.playbackPosition.set(0);
      this.playbackDuration.set((track.duration ?? 0) / 1000);
      void this.lyricsService.loadLyricsForTrack(track);
      try {
        await LocalMusicBridge.play({
          queue: queue.map((item) => ({
            uri: item.uri ?? '',
            title: item.title,
            artist: item.artist ?? 'Artiste inconnu',
            album: item.album ?? 'Album inconnu',
          })),
          index,
          repeatMode: this.repeatMode(),
        });
        await this.collectionStore.recordPlayed(track.id);
        await this.refreshCollection();
      } catch (error) {
        this.playbackState.set('error');
        this.localMusicMessage.set(error instanceof Error ? error.message : 'La lecture a échoué.');
      }
    } else {
      await this.playLocalTrack(track);
    }
  }

  protected onWaveformPointerDown(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      void 0;
    }
    this.isScrubbing.set(true);
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    this.scrubPosition.set(ratio * (this.playbackDuration() || 0));
  }

  protected onWaveformPointerMove(event: PointerEvent): void {
    if (!this.isScrubbing()) return;
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    this.scrubPosition.set(ratio * (this.playbackDuration() || 0));
  }

  protected async onWaveformPointerUp(event: PointerEvent): Promise<void> {
    if (!this.isScrubbing()) return;
    const target = event.currentTarget as HTMLElement;
    const rect = target?.getBoundingClientRect();
    let newPos = this.scrubPosition();
    if (rect && rect.width > 0) {
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      newPos = ratio * (this.playbackDuration() || 0);
    }
    this.isScrubbing.set(false);
    this.playbackPosition.set(newPos);
    try {
      target?.releasePointerCapture(event.pointerId);
    } catch {
      void 0;
    }
    await this.seekToPosition(newPos);
  }

  protected onWaveformPointerCancel(event: PointerEvent): void {
    this.isScrubbing.set(false);
    try {
      (event.currentTarget as HTMLElement)?.releasePointerCapture(event.pointerId);
    } catch {
      void 0;
    }
  }

  protected async onWaveformClick(event: MouseEvent): Promise<void> {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const newPos = ratio * (this.playbackDuration() || 0);
    await this.seekToPosition(newPos);
  }

  protected async seekToLyric(timeSeconds: number): Promise<void> {
    await this.seekToPosition(timeSeconds);
  }

  protected readonly manualLyricsQuery = signal('');

  protected openLyrics(): void {
    const track = this.activeLocalTrack();
    if (track) {
      this.manualLyricsQuery.set(
        `${track.artist !== 'Artiste inconnu' ? track.artist + ' ' : ''}${track.title}`,
      );
      void this.lyricsService.loadLyricsForTrack(track);
    }
    this.navigate('lyrics');
  }

  protected closeLyrics(): void {
    this.navigate('player');
  }

  protected onManualQueryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.manualLyricsQuery.set(input.value);
  }

  protected async retryLyrics(): Promise<void> {
    const track = this.activeLocalTrack();
    if (track) {
      await this.lyricsService.loadLyricsForTrack(track, true);
    }
  }

  protected async searchLyricsManually(): Promise<void> {
    const track = this.activeLocalTrack();
    const query = this.manualLyricsQuery().trim();
    if (track && query) {
      await this.lyricsService.searchCustom(track.id, query);
    }
  }

  protected getTrackArtwork(
    track: PlayableLocalTrack | LocalMusicTrack | undefined | null,
  ): string | null {
    return this.artworkService.getArtwork(track);
  }

  protected cycleRepeat(): void {
    const current = this.repeatMode();
    const next: RepeatMode = current === 'none' ? 'all' : current === 'all' ? 'one' : 'none';
    void this.setRepeat(next);
  }

  protected async setRepeat(mode: RepeatMode): Promise<void> {
    this.repeatMode.set(mode);
    await Preferences.set({ key: 'playback-repeat', value: mode });
    if (this.isAndroid) await LocalMusicBridge.setRepeatMode({ mode });
  }

  protected async toggleShuffle(): Promise<void> {
    const newShuffle = !this.shuffleEnabled();
    this.shuffleEnabled.set(newShuffle);
    await Preferences.set({ key: 'playback-shuffle', value: String(newShuffle) });

    const currentTrack = this.activeLocalTrack();
    if (!currentTrack) return;

    const allTracks = this.localTracks();
    let newQueue: PlayableLocalTrack[];

    if (newShuffle) {
      const remaining = allTracks.filter((track) => track.id !== currentTrack.id);
      const shuffledOthers = [...remaining].sort(() => Math.random() - 0.5);
      newQueue = [currentTrack, ...shuffledOthers];
    } else {
      newQueue = allTracks;
    }

    this.playbackQueue.set(newQueue);

    if (this.isAndroid) {
      await LocalMusicBridge.updateQueue({
        queue: newQueue.map((track) => ({
          uri: track.uri ?? '',
          title: track.title,
          artist: track.artist ?? 'Artiste inconnu',
          album: track.album ?? 'Album inconnu',
        })),
        repeatMode: this.repeatMode(),
      }).catch(() => undefined);
    }
  }

  protected formatTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)
      .toString()
      .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  }

  protected formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KO`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MO`;
  }

  protected async toggleAutoScan(event: Event): Promise<void> {
    const enabled = (event.target as HTMLInputElement).checked;
    this.autoScan.set(enabled);
    await Preferences.set({ key: 'library-auto-scan', value: String(enabled) });
  }

  protected async selectTheme(theme: ThemeMode): Promise<void> {
    this.theme.set(theme);
    await Preferences.set({ key: 'theme', value: theme });
  }

  private async initialize(): Promise<void> {
    const [autoScanPref, themePref, repeatPref, shufflePref] = await Promise.all([
      Preferences.get({ key: 'library-auto-scan' }),
      Preferences.get({ key: 'theme' }),
      Preferences.get({ key: 'playback-repeat' }),
      Preferences.get({ key: 'playback-shuffle' }),
    ]);
    this.autoScan.set(autoScanPref.value !== 'false');
    this.theme.set(
      themePref.value === 'vinyl' || themePref.value === 'system' ? themePref.value : 'paper',
    );
    this.repeatMode.set(
      repeatPref.value === 'one' || repeatPref.value === 'all' ? repeatPref.value : 'none',
    );
    this.shuffleEnabled.set(shufflePref.value === 'true');
    if (this.isAndroid) {
      try {
        const access = await LocalMusicBridge.hasAccess();
        this.permissionGranted.set(access.granted);
        if (access.granted && this.autoScan()) await this.scanDeviceMusic(false);
      } catch {
        this.permissionGranted.set(false);
      }
    } else {
      await this.scanDeviceMusic(false);
    }
    await this.refreshCollection();
  }

  private async loadPlaylists(): Promise<void> {
    const loadVersion = ++this.playlistLoadVersion;
    try {
      const playlists = await this.collectionStore.listPlaylists();
      if (loadVersion !== this.playlistLoadVersion) return;
      this.playlists.update((current) => {
        const latestById = new Map(current.map((playlist) => [playlist.id, playlist]));
        for (const playlist of playlists) latestById.set(playlist.id, playlist);
        return [...latestById.values()].sort((first, second) => second.updatedAt - first.updatedAt);
      });
      this.collectionStoreReady.set(true);
    } catch {
      if (loadVersion !== this.playlistLoadVersion) return;
      this.collectionStoreReady.set(false);
    }
  }

  private async refreshCollection(): Promise<void> {
    const [favorites, history] = await Promise.all([
      this.collectionStore.listFavoriteTrackIds().catch(() => [] as string[]),
      this.collectionStore.listHistoryTrackIds().catch(() => [] as string[]),
    ]);
    this.favoriteTrackIds.set(favorites);
    this.historyTrackIds.set(history);
    await this.loadPlaylists();
    const playlistId = this.activePlaylistId();
    if (playlistId)
      this.playlistTrackIds.set(
        await this.collectionStore.listPlaylistTrackIds(playlistId).catch(() => []),
      );
  }

  private fromDeviceTrack(track: DeviceMusicTrack): PlayableLocalTrack {
    return {
      id: track.id,
      uri: track.uri,
      title: track.title,
      artist: track.artist,
      album: track.album,
      albumId: track.albumId,
      duration: track.duration,
      mimeType: track.mimeType,
      size: track.size,
      addedAt: track.modifiedAt,
      modifiedAt: track.modifiedAt,
      url: '',
    };
  }

  private fromBrowserTrack(track: LocalMusicTrack): PlayableLocalTrack {
    return { ...track, url: track.file ? URL.createObjectURL(track.file) : '' };
  }

  private async handleNativePlayback(event: PlaybackStateEvent): Promise<void> {
    if (event.trackId && this.localTracks().some((track) => track.id === event.trackId)) {
      this.activeLocalTrackId.set(event.trackId);
      const active = this.localTracks().find((track) => track.id === event.trackId);
      if (active) void this.lyricsService.loadLyricsForTrack(active);
    }
    this.playbackState.set(event.state);
    if (!this.isScrubbing()) {
      this.playbackPosition.set(event.position / 1000);
    }
    this.playbackDuration.set(event.duration / 1000);
    if (event.error) this.localMusicMessage.set(event.error);
  }

  private async playNextLocalTrack(): Promise<void> {
    const queue = this.playbackQueue().length ? this.playbackQueue() : this.localTracks();
    const currentIndex = queue.findIndex((track) => track.id === this.activeLocalTrackId());

    if (this.repeatMode() === 'one' && this.activeLocalTrack()) {
      await this.seekToPosition(0);
      await this.audioEngine.play();
      return;
    }

    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      await this.playLocalTrack(queue[currentIndex + 1]);
    } else if (this.repeatMode() === 'all' && queue.length > 0) {
      await this.playLocalTrack(queue[0]);
    } else {
      this.playbackState.set('ended');
    }
  }

  private async handleRemoteCommand(
    command: 'play' | 'pause' | 'next' | 'previous',
  ): Promise<void> {
    const track = this.activeLocalTrack();
    if (!track) return;
    if (command === 'play') await this.togglePlayback();
    if (command === 'pause') await this.audioEngine.pause();
    if (command === 'next') await this.handleNextTrack();
    if (command === 'previous') await this.handlePreviousTrack();
  }

  private scrollScreenToTop(): void {
    requestAnimationFrame(() =>
      this.appScreen?.nativeElement.scrollTo({ top: 0, behavior: 'auto' }),
    );
  }
}
