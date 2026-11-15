import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { App as CapacitorApp } from '@capacitor/app';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { IonApp } from '@ionic/angular/standalone';
import { environment } from '../environments/environment';
import type { AudioState } from './core/audio/audio-engine';
import { LocalMusicLibrary, type LocalMusicTrack } from './core/audio/local-music-library';
import { WebAudioEngine } from './core/audio/web-audio.engine';
import { DatabaseService, type HearPlaylist } from './core/data/database.service';

type HearScreen = 'home' | 'search' | 'collection' | 'offline' | 'settings';
type CollectionFilter = 'favorites' | 'playlists' | 'local' | 'history';
type PlayableLocalTrack = LocalMusicTrack & { url: string };

@Component({
  imports: [FormsModule, IonApp],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  @ViewChild('appScreen') private appScreen?: ElementRef<HTMLElement>;
  private readonly database = inject(DatabaseService);
  private readonly localMusic = inject(LocalMusicLibrary);
  private readonly audioEngine = new WebAudioEngine();
  private readonly navigationHistory: HearScreen[] = [];
  protected readonly activeScreen = signal<HearScreen>('home');
  protected readonly collectionFilter = signal<CollectionFilter>('playlists');
  protected readonly databaseStatus = signal('À VÉRIFIER');
  protected readonly databaseMessage = signal('La base locale sera vérifiée sur cet appareil.');
  protected readonly isCheckingDatabase = signal(false);
  protected readonly playlists = signal<HearPlaylist[]>([]);
  protected readonly isCreatingPlaylist = signal(false);
  protected readonly playlistName = signal('');
  protected readonly playlistMessage = signal('');
  protected readonly menuOpen = signal(false);
  protected readonly localTracks = signal<PlayableLocalTrack[]>([]);
  protected readonly activeLocalTrackId = signal<string | null>(null);
  protected readonly activeLocalTrack = computed(
    () => this.localTracks().find((track) => track.id === this.activeLocalTrackId()) ?? null,
  );
  protected readonly audioState = signal<AudioState>('idle');
  protected readonly playbackPosition = signal(0);
  protected readonly playbackDuration = signal(0);
  protected readonly isImportingTracks = signal(false);
  protected readonly localMusicMessage = signal(
    'Choisissez des fichiers audio sur votre téléphone. Ils restent dans la bibliothèque privée de Hear.',
  );

  private readonly audioEvents = this.audioEngine.events.subscribe((event) => {
    if (event.type === 'state') this.audioState.set(event.state);
    if (event.type === 'position') {
      this.playbackPosition.set(event.position);
      this.playbackDuration.set(event.duration);
    }
    if (event.type === 'ended') void this.playNextLocalTrack();
    if (event.type === 'error') this.localMusicMessage.set(event.message);
    if (event.type === 'remoteCommand') void this.handleRemoteCommand(event.command);
  });
  private readonly localTracksReady: Promise<void>;

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void ScreenOrientation.lock({ orientation: 'portrait' }).catch((error: unknown) => {
        console.warn('Le verrouillage portrait n’a pas pu être appliqué.', error);
      });
      void CapacitorApp.addListener('backButton', () => this.handleBack()).catch((error: unknown) =>
        console.warn('Le bouton Retour Android n’a pas pu être relié.', error),
      );
    }
    void this.loadPlaylists();
    this.localTracksReady = this.loadLocalTracks();
  }

  protected hasJamendoClientId(): boolean {
    return environment.jamendoClientId.trim().length > 0;
  }

  protected navigate(screen: HearScreen): void {
    if (screen !== this.activeScreen()) this.navigationHistory.push(this.activeScreen());
    this.activeScreen.set(screen);
    this.menuOpen.set(false);
    this.scrollScreenToTop();
    if (screen === 'collection') void this.loadPlaylists();
  }

  protected openLocalLibrary(): void {
    this.collectionFilter.set('local');
    this.navigate('collection');
  }

  protected handleBack(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }
    if (this.isCreatingPlaylist()) {
      this.isCreatingPlaylist.set(false);
      this.playlistMessage.set('');
      return;
    }

    const previousScreen = this.navigationHistory.pop();
    if (previousScreen) {
      this.activeScreen.set(previousScreen);
    } else if (this.activeScreen() !== 'home') {
      this.activeScreen.set('home');
    } else if (Capacitor.isNativePlatform()) {
      void CapacitorApp.exitApp();
    }
    this.scrollScreenToTop();
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    if (!Capacitor.isNativePlatform()) this.handleBack();
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected async loadPlaylists(): Promise<void> {
    try {
      this.playlists.set(await this.database.listPlaylists());
    } catch {
      // The rest of the app remains available if local storage is unavailable.
    }
  }

  protected async createPlaylist(): Promise<void> {
    const name = this.playlistName().trim();
    if (!name) {
      this.playlistMessage.set('Donnez un nom à votre playlist.');
      return;
    }

    try {
      await this.database.createPlaylist(name);
      this.playlistName.set('');
      this.isCreatingPlaylist.set(false);
      this.playlistMessage.set('Playlist créée sur cet appareil.');
      await this.loadPlaylists();
    } catch {
      this.playlistMessage.set(
        'Impossible d’enregistrer la playlist. Vérifiez SQLite dans Réglages.',
      );
    }
  }

  protected async deletePlaylist(id: string): Promise<void> {
    try {
      await this.database.deletePlaylist(id);
      this.playlistMessage.set('Playlist supprimée.');
      await this.loadPlaylists();
    } catch {
      this.playlistMessage.set('Impossible de supprimer cette playlist.');
    }
  }

  protected async importLocalFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    this.isImportingTracks.set(true);
    this.localMusicMessage.set('Import des fichiers audio dans Hear…');
    try {
      await this.localTracksReady;
      const addedTracks = await this.localMusic.add(files);
      const playableTracks = addedTracks.map((track) => this.makePlayableTrack(track));
      this.localTracks.update((tracks) => [...playableTracks, ...tracks]);
      this.collectionFilter.set('local');
      this.activeScreen.set('collection');
      this.scrollScreenToTop();
      this.localMusicMessage.set(
        `${playableTracks.length} fichier(s) ajouté(s) à la bibliothèque locale.`,
      );
    } catch (error) {
      this.collectionFilter.set('local');
      this.activeScreen.set('collection');
      this.scrollScreenToTop();
      this.localMusicMessage.set(
        error instanceof Error ? error.message : 'Impossible d’importer ces fichiers audio.',
      );
    } finally {
      this.isImportingTracks.set(false);
    }
  }

  protected async loadLocalTracks(): Promise<void> {
    try {
      const tracks = await this.localMusic.list();
      this.localTracks.set(tracks.map((track) => this.makePlayableTrack(track)));
    } catch {
      this.localMusicMessage.set('La bibliothèque audio locale n’a pas pu être ouverte.');
    }
  }

  protected async playLocalTrack(track: PlayableLocalTrack): Promise<void> {
    if (this.activeLocalTrackId() === track.id && this.audioState() === 'playing') {
      await this.audioEngine.pause();
      return;
    }
    try {
      if (this.activeLocalTrackId() === track.id && this.audioState() === 'paused') {
        await this.audioEngine.play();
        return;
      }

      this.activeLocalTrackId.set(track.id);
      this.localMusicMessage.set('');
      await this.audioEngine.load(
        { uri: track.url, isLocal: true },
        { id: track.id, title: track.title, artist: 'Fichier local' },
      );
      await this.audioEngine.play();
    } catch {
      this.audioState.set('error');
      this.localMusicMessage.set('Ce format audio ne peut pas être lu sur cet appareil.');
    }
  }

  protected async removeLocalTrack(track: PlayableLocalTrack): Promise<void> {
    try {
      if (this.activeLocalTrackId() === track.id) {
        await this.audioEngine.stop();
        this.activeLocalTrackId.set(null);
        this.playbackPosition.set(0);
        this.playbackDuration.set(0);
      }
      await this.localMusic.remove(track.id);
      URL.revokeObjectURL(track.url);
      this.localTracks.update((tracks) => tracks.filter((item) => item.id !== track.id));
      this.localMusicMessage.set('Fichier supprimé de la bibliothèque Hear.');
    } catch {
      this.localMusicMessage.set('Impossible de supprimer ce fichier audio.');
    }
  }

  protected async seekLocalTrack(event: Event): Promise<void> {
    const position = Number((event.target as HTMLInputElement).value);
    await this.audioEngine.seek(position).catch(() => undefined);
  }

  protected async handleNextTrack(): Promise<void> {
    await this.playNextLocalTrack();
  }

  protected async handlePreviousTrack(): Promise<void> {
    const currentIndex = this.localTracks().findIndex(
      (track) => track.id === this.activeLocalTrackId(),
    );
    if (currentIndex > 0) {
      await this.playLocalTrack(this.localTracks()[currentIndex - 1]);
    } else {
      await this.audioEngine.seek(0).catch(() => undefined);
    }
  }

  protected formatTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    return `${Math.floor(total / 60)
      .toString()
      .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  }

  protected async verifyDatabase(): Promise<void> {
    this.isCheckingDatabase.set(true);
    this.databaseStatus.set('EN COURS');
    this.databaseMessage.set('Écriture puis lecture dans la base locale…');

    try {
      const passed = await this.database.verifyReadWrite();
      this.databaseStatus.set(passed ? 'PRÊTE' : 'ÉCHEC');
      this.databaseMessage.set(
        passed
          ? 'Lecture et écriture SQLite vérifiées sur cet appareil.'
          : 'La vérification SQLite a échoué.',
      );
      await this.loadPlaylists();
    } catch {
      this.databaseStatus.set('INDISPONIBLE');
      this.databaseMessage.set('SQLite n’a pas pu démarrer sur cet appareil.');
    } finally {
      this.isCheckingDatabase.set(false);
    }
  }

  private makePlayableTrack(track: LocalMusicTrack): PlayableLocalTrack {
    return { ...track, url: URL.createObjectURL(track.file) };
  }

  private async playNextLocalTrack(): Promise<void> {
    const tracks = this.localTracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.activeLocalTrackId());
    if (currentIndex < 0 || currentIndex >= tracks.length - 1) {
      this.audioState.set('ended');
      return;
    }
    await this.playLocalTrack(tracks[currentIndex + 1]);
  }

  private async handleRemoteCommand(
    command: 'play' | 'pause' | 'next' | 'previous',
  ): Promise<void> {
    const track = this.activeLocalTrack();
    if (!track) return;
    if (command === 'play') await this.playLocalTrack(track);
    if (command === 'pause') await this.audioEngine.pause();
    if (command === 'next') await this.playNextLocalTrack();
    if (command === 'previous') {
      const index = this.localTracks().findIndex((item) => item.id === track.id);
      if (index > 0) await this.playLocalTrack(this.localTracks()[index - 1]);
      else await this.playLocalTrack(track);
    }
  }

  private scrollScreenToTop(): void {
    requestAnimationFrame(() =>
      this.appScreen?.nativeElement.scrollTo({ top: 0, behavior: 'auto' }),
    );
  }
}
