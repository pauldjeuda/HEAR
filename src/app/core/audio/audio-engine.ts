import type { Observable } from 'rxjs';

export interface AudioSource {
  uri: string;
  isLocal: boolean;
}

export interface NowPlayingMeta {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  duration?: number;
}

export type AudioState =
  'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';

export type EngineEvent =
  | { type: 'state'; state: AudioState }
  | { type: 'position'; position: number; duration: number; buffered: number }
  | { type: 'ended' }
  | { type: 'error'; message: string }
  | { type: 'interruption'; active: boolean }
  | { type: 'remoteCommand'; command: 'play' | 'pause' | 'next' | 'previous' };

export interface AudioEngine {
  readonly events: Observable<EngineEvent>;
  load(source: AudioSource, metadata: NowPlayingMeta, startAt?: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(seconds: number): Promise<void>;
  preloadNext(source: AudioSource | null): Promise<void>;
  setNowPlaying(metadata: NowPlayingMeta): Promise<void>;
}
