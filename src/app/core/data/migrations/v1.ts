export const INITIAL_SCHEMA_V1 = [
  `CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT,
    website TEXT,
    joined_at TEXT,
    cached_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist_id TEXT,
    artist_name TEXT,
    image_url TEXT,
    release_date TEXT,
    cached_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'jamendo',
    provider_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist_id TEXT,
    artist_name TEXT NOT NULL,
    album_id TEXT,
    album_title TEXT,
    position INTEGER,
    duration_s INTEGER NOT NULL,
    image_url TEXT,
    stream_url TEXT,
    download_url TEXT,
    download_allowed INTEGER NOT NULL DEFAULT 0,
    license_url TEXT,
    release_date TEXT,
    tags TEXT,
    cached_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist_id)',
  'CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id)',
  `CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, position),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  )`,
  'CREATE TABLE IF NOT EXISTS favorites (track_id TEXT PRIMARY KEY, added_at INTEGER NOT NULL)',
  `CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id TEXT NOT NULL,
    played_at INTEGER NOT NULL,
    listened_s INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS idx_history_played ON history(played_at DESC)',
  `CREATE TABLE IF NOT EXISTS downloads (
    track_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('queued','downloading','paused','completed','failed','canceled')),
    bytes_done INTEGER NOT NULL DEFAULT 0,
    bytes_total INTEGER,
    local_audio_path TEXT,
    local_cover_path TEXT,
    format TEXT,
    error_code TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  )`,
  'CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)',
  `CREATE TABLE IF NOT EXISTS lyrics (
    track_id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('synced','plain','instrumental','none')),
    content TEXT,
    lrclib_id INTEGER,
    offset_ms INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'lrclib',
    fetched_at INTEGER NOT NULL,
    retry_after INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS http_cache (
    key TEXT PRIMARY KEY,
    body TEXT NOT NULL,
    etag TEXT,
    fetched_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS player_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    queue_json TEXT NOT NULL,
    queue_index INTEGER NOT NULL,
    position_s REAL NOT NULL,
    repeat TEXT NOT NULL,
    shuffle INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE TABLE IF NOT EXISTS recent_searches (query TEXT PRIMARY KEY, searched_at INTEGER NOT NULL)',
  `CREATE TABLE IF NOT EXISTS data_usage (
    day TEXT PRIMARY KEY,
    stream_bytes INTEGER NOT NULL DEFAULT 0,
    download_bytes INTEGER NOT NULL DEFAULT 0,
    api_bytes INTEGER NOT NULL DEFAULT 0
  )`,
] as const;

export const DATABASE_MIGRATIONS = [{ toVersion: 1, statements: [...INITIAL_SCHEMA_V1] }];
