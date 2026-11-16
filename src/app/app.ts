import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { IonApp } from '@ionic/angular/standalone';
import type { AudioState } from './core/audio/audio-engine';
import { LocalMusicLibrary, type LocalMusicTrack } from './core/audio/local-music-library';
import {
  LocalMusicBridge,
  type DeviceMusicTrack,
  type PlaybackStateEvent,
} from './core/audio/local-music-bridge';
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
  | 'player';
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
  protected readonly appVersion = '0.2.0';
  @ViewChild('appScreen') private appScreen?: ElementRef<HTMLElement>;
  private readonly collectionStore = inject(LocalCollectionStore);
  private readonly localMusic = inject(LocalMusicLibrary);
  private readonly audioEngine = new WebAudioEngine();
  private readonly navigationHistory: HearScreen[] = [];
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
  protected readonly isAndroid = Capacitor.getPlatform() === 'android';

  protected readonly activeLocalTrack = computed(
    () => this.localTracks().find((track) => track.id === this.activeLocalTrackId()) ?? null,
  );
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
      this.playbackPosition.set(event.position);
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
      await this.collectionStore.createPlaylist(name);
      this.playlistName.set('');
      this.isCreatingPlaylist.set(false);
      this.playlistMessage.set('Playlist créée sur ce téléphone.');
      await this.loadPlaylists();
    } catch {
      this.playlistMessage.set('La playlist n’a pas pu être enregistrée.');
    }
  }

  protected async deletePlaylist(id: string): Promise<void> {
    try {
      await this.collectionStore.deletePlaylist(id);
      this.playlistMessage.set('Playlist supprimée.');
      if (this.activePlaylistId() === id) this.setCollectionFilter('playlists');
      await this.loadPlaylists();
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
    return this.localTracks()
      .filter((track) => track.id !== currentId)
      .slice(0, 3);
  }

  protected openArtist(artist: string): void {
    this.selectedArtist.set(artist);
    this.navigate('artist');
  }

  protected async playLocalTrack(track: PlayableLocalTrack): Promise<void> {
    if (this.isAndroid) {
      if (this.activeLocalTrackId() === track.id && this.playbackState() === 'playing') {
        await LocalMusicBridge.toggle();
        return;
      }
      const tracks = this.localTracks();
      const index = tracks.findIndex((item) => item.id === track.id);
      this.activeLocalTrackId.set(track.id);
      this.playbackState.set('loading');
      this.playbackPosition.set(0);
      this.playbackDuration.set((track.duration ?? 0) / 1000);
      this.navigate('player');
      try {
        await LocalMusicBridge.play({
          queue: tracks.map((item) => ({
            uri: item.uri ?? '',
            title: item.title,
            artist: item.artist ?? 'Artiste inconnu',
            album: item.album ?? 'Album inconnu',
          })),
          index: Math.max(0, index),
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
    const currentIndex = this.localTracks().findIndex(
      (track) => track.id === this.activeLocalTrackId(),
    );
    if (currentIndex > 0) await this.playLocalTrack(this.localTracks()[currentIndex - 1]);
    else await this.audioEngine.seek(0).catch(() => undefined);
  }

  protected async seekLocalTrack(event: Event): Promise<void> {
    const position = Number((event.target as HTMLInputElement).value);
    this.playbackPosition.set(position);
    if (this.isAndroid) await LocalMusicBridge.seek({ position: Math.round(position * 1000) });
    else await this.audioEngine.seek(position).catch(() => undefined);
  }

  protected async setRepeat(mode: RepeatMode): Promise<void> {
    this.repeatMode.set(mode);
    await Preferences.set({ key: 'playback-repeat', value: mode });
    if (this.isAndroid) await LocalMusicBridge.setRepeatMode({ mode });
  }

  protected async toggleShuffle(): Promise<void> {
    this.shuffleEnabled.update((enabled) => !enabled);
    await Preferences.set({ key: 'playback-shuffle', value: String(this.shuffleEnabled()) });
    if (this.activeLocalTrack()) {
      const current = this.activeLocalTrack()!;
      const remaining = this.localTracks().filter((track) => track.id !== current.id);
      const ordered = this.shuffleEnabled()
        ? [current, ...remaining.sort(() => Math.random() - 0.5)]
        : this.localTracks();
      if (this.isAndroid) {
        const mode = this.repeatMode();
        await LocalMusicBridge.play({
          queue: ordered.map((track) => ({
            uri: track.uri ?? '',
            title: track.title,
            artist: track.artist ?? 'Artiste inconnu',
            album: track.album ?? 'Album inconnu',
          })),
          index: 0,
          repeatMode: mode,
        });
      }
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
    try {
      this.playlists.set(await this.collectionStore.listPlaylists());
      this.collectionStoreReady.set(true);
    } catch {
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
    }
    this.playbackState.set(event.state);
    this.playbackPosition.set(event.position / 1000);
    this.playbackDuration.set(event.duration / 1000);
    if (event.error) this.localMusicMessage.set(event.error);
  }

  private async playNextLocalTrack(): Promise<void> {
    const tracks = this.localTracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.activeLocalTrackId());
    if (currentIndex < 0 || currentIndex >= tracks.length - 1) {
      this.playbackState.set('ended');
      return;
    }
    await this.playLocalTrack(tracks[currentIndex + 1]);
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
