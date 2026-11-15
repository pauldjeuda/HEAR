import { DATABASE_MIGRATIONS, INITIAL_SCHEMA_V1 } from './v1';

describe('initial SQLite schema', () => {
  it('registers the first versioned migration', () => {
    expect(DATABASE_MIGRATIONS).toHaveLength(1);
    expect(DATABASE_MIGRATIONS[0].toVersion).toBe(1);
  });

  it('creates the local library tables and indexes', () => {
    const schema = INITIAL_SCHEMA_V1.join('\n');

    for (const table of [
      'artists',
      'albums',
      'tracks',
      'playlists',
      'playlist_tracks',
      'favorites',
      'history',
      'downloads',
      'lyrics',
      'http_cache',
      'player_state',
      'recent_searches',
      'data_usage',
    ]) {
      expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }

    expect(schema).toContain('idx_tracks_artist');
    expect(schema).toContain('idx_history_played');
  });
});
