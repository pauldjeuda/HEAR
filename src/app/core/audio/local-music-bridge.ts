import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface DeviceMusicTrack {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  size: number;
  mimeType: string;
  modifiedAt: number;
}

export interface PlaybackStateEvent {
  state: 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
  trackId: string;
  position: number;
  duration: number;
  error?: string;
}

interface LocalMusicPlugin {
  hasAccess(): Promise<{ granted: boolean }>;
  requestAccess(): Promise<{ granted: boolean }>;
  scan(): Promise<{ tracks: DeviceMusicTrack[]; scannedAt: number }>;
  play(options: {
    queue: Pick<DeviceMusicTrack, 'uri' | 'title' | 'artist' | 'album'>[];
    index: number;
    repeatMode: 'none' | 'one' | 'all';
  }): Promise<void>;
  toggle(): Promise<void>;
  pause(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  seek(options: { position: number }): Promise<void>;
  stop(): Promise<void>;
  setRepeatMode(options: { mode: 'none' | 'one' | 'all' }): Promise<void>;
  addListener(
    eventName: 'playbackState',
    listenerFunc: (event: PlaybackStateEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const LocalMusicBridge = registerPlugin<LocalMusicPlugin>('LocalMusic');
