import { Subject } from 'rxjs';
import type {
  AudioEngine,
  AudioSource,
  AudioState,
  EngineEvent,
  NowPlayingMeta,
} from './audio-engine';

/** Browser-only engine for development and automated UI checks. Android uses HearAudio/Media3. */
export class WebAudioEngine implements AudioEngine {
  private readonly audio = new Audio();
  private readonly eventSubject = new Subject<EngineEvent>();
  private nextAudio?: HTMLAudioElement;
  readonly events = this.eventSubject.asObservable();

  constructor() {
    this.audio.preload = 'metadata';
    this.audio.addEventListener('loadstart', () => this.emitState('loading'));
    this.audio.addEventListener('waiting', () => this.emitState('buffering'));
    this.audio.addEventListener('playing', () => this.emitState('playing'));
    this.audio.addEventListener('pause', () => this.emitState('paused'));
    this.audio.addEventListener('timeupdate', () => this.emitPosition());
    this.audio.addEventListener('progress', () => this.emitPosition());
    this.audio.addEventListener('ended', () => {
      this.emitState('ended');
      this.eventSubject.next({ type: 'ended' });
    });
    this.audio.addEventListener('error', () => {
      this.emitState('error');
      this.eventSubject.next({ type: 'error', message: 'La source audio est indisponible.' });
    });
  }

  async load(source: AudioSource, metadata: NowPlayingMeta, startAt = 0): Promise<void> {
    this.emitState('loading');
    this.audio.pause();
    this.audio.src = source.uri;
    this.audio.load();
    await this.waitForCanPlay();
    if (startAt > 0) {
      await this.seek(startAt);
    }
    await this.setNowPlaying(metadata);
  }

  async play(): Promise<void> {
    await this.audio.play();
  }

  async pause(): Promise<void> {
    this.audio.pause();
  }

  async stop(): Promise<void> {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.emitState('idle');
  }

  async seek(seconds: number): Promise<void> {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new RangeError('La position audio doit être positive et finie.');
    }
    this.audio.currentTime = Math.min(
      seconds,
      Number.isFinite(this.audio.duration) ? this.audio.duration : seconds,
    );
  }

  async preloadNext(source: AudioSource | null): Promise<void> {
    this.nextAudio?.pause();
    this.nextAudio = undefined;
    if (source) {
      this.nextAudio = new Audio(source.uri);
      this.nextAudio.preload = 'auto';
    }
  }

  async setNowPlaying(metadata: NowPlayingMeta): Promise<void> {
    const mediaSession = navigator.mediaSession;
    if (!mediaSession || typeof MediaMetadata === 'undefined') {
      return;
    }

    mediaSession.metadata = new MediaMetadata({
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      artwork: metadata.artworkUrl ? [{ src: metadata.artworkUrl }] : [],
    });
    const commandMap = {
      play: 'play',
      pause: 'pause',
      nexttrack: 'next',
      previoustrack: 'previous',
    } as const;
    for (const [action, command] of Object.entries(commandMap) as [
      MediaSessionAction,
      (typeof commandMap)[keyof typeof commandMap],
    ][]) {
      mediaSession.setActionHandler(action, () =>
        this.eventSubject.next({ type: 'remoteCommand', command }),
      );
    }
    if (metadata.duration && Number.isFinite(metadata.duration) && this.audio.duration > 0) {
      mediaSession.setPositionState({
        duration: this.audio.duration,
        playbackRate: this.audio.playbackRate,
        position: Math.min(this.audio.currentTime, this.audio.duration),
      });
    }
  }

  private waitForCanPlay(): Promise<void> {
    if (this.audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const ready = (): void => {
        cleanup();
        resolve();
      };
      const failed = (): void => {
        cleanup();
        reject(new Error('La source audio ne peut pas être chargée.'));
      };
      const cleanup = (): void => {
        this.audio.removeEventListener('canplay', ready);
        this.audio.removeEventListener('error', failed);
      };

      this.audio.addEventListener('canplay', ready, { once: true });
      this.audio.addEventListener('error', failed, { once: true });
    });
  }

  private emitState(state: AudioState): void {
    this.eventSubject.next({ type: 'state', state });
  }

  private emitPosition(): void {
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    let buffered = 0;
    if (this.audio.buffered.length > 0) {
      buffered = this.audio.buffered.end(this.audio.buffered.length - 1);
    }
    this.eventSubject.next({
      type: 'position',
      position: this.audio.currentTime,
      duration,
      buffered,
    });
  }
}
