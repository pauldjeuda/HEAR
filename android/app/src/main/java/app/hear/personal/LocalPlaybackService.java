package app.hear.personal;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaMetadataRetriever;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.Nullable;

import java.io.IOException;
import java.util.ArrayList;

public class LocalPlaybackService extends Service {
    public static final String ACTION_START = "app.hear.personal.action.START";
    public static final String ACTION_TOGGLE = "app.hear.personal.action.TOGGLE";
    public static final String ACTION_PAUSE = "app.hear.personal.action.PAUSE";
    public static final String ACTION_NEXT = "app.hear.personal.action.NEXT";
    public static final String ACTION_PREVIOUS = "app.hear.personal.action.PREVIOUS";
    public static final String ACTION_SEEK = "app.hear.personal.action.SEEK";
    public static final String ACTION_REPEAT = "app.hear.personal.action.REPEAT";
    public static final String ACTION_UPDATE_QUEUE = "app.hear.personal.action.UPDATE_QUEUE";
    public static final String ACTION_STOP = "app.hear.personal.action.STOP";
    public static final String EXTRA_URIS = "uris";
    public static final String EXTRA_TITLES = "titles";
    public static final String EXTRA_ARTISTS = "artists";
    public static final String EXTRA_ALBUMS = "albums";
    public static final String EXTRA_INDEX = "index";
    public static final String EXTRA_REPEAT = "repeat";
    public static final String EXTRA_POSITION = "position";

    private static final String CHANNEL_ID = "hear-local-playback";
    private static final int NOTIFICATION_ID = 4201;
    private static final String EVENT_ACTION = "app.hear.personal.PLAYBACK_EVENT";

    private final ArrayList<String> uris = new ArrayList<>();
    private final ArrayList<String> titles = new ArrayList<>();
    private final ArrayList<String> artists = new ArrayList<>();
    private final ArrayList<String> albums = new ArrayList<>();
    private MediaPlayer player;
    private boolean playerPrepared;
    private MediaSession mediaSession;
    private AudioManager audioManager;
    private AudioFocusRequest audioFocusRequest;
    private int index;
    private boolean wantsPlayback;
    private String repeatMode = "none";
    private String state = "idle";
    private String lastError;
    private boolean isDucked = false;
    private boolean resumeOnFocusGain = false;
    private Bitmap cachedArtworkBitmap;
    private String cachedArtworkUri;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable progressTick = new Runnable() {
        @Override public void run() {
            handler.removeCallbacks(this);
            if (wantsPlayback) {
                if (isPlayerPlaying()) {
                    publishState(false);
                }
                handler.postDelayed(this, 250L);
            }
        }
    };
    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        switch (change) {
            case AudioManager.AUDIOFOCUS_LOSS:
                // Perte définitive du focus audio (ex. autre lecteur musical lancé)
                resumeOnFocusGain = false;
                isDucked = false;
                if (player != null) {
                    try { player.setVolume(1.0f, 1.0f); } catch (Exception ignored) {}
                }
                pause();
                break;

            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                // Perte temporaire (ex. appel téléphonique, alarme) : pause temporaire avec reprise automatique
                if (isPlayerPlaying()) {
                    resumeOnFocusGain = true;
                    try { player.pause(); } catch (IllegalStateException ignored) {}
                    state = "paused";
                    handler.removeCallbacks(progressTick);
                    publishState();
                }
                break;

            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // Notification, guidage GPS : baisse du volume sonore au lieu d'arrêter la musique
                if (isPlayerPlaying() && player != null) {
                    isDucked = true;
                    try { player.setVolume(0.2f, 0.2f); } catch (Exception ignored) {}
                }
                break;

            case AudioManager.AUDIOFOCUS_GAIN:
                // Retour du focus audio : rétablissement du volume d'origine
                if (isDucked) {
                    isDucked = false;
                    if (player != null) {
                        try { player.setVolume(1.0f, 1.0f); } catch (Exception ignored) {}
                    }
                }
                // Reprise si mis en pause temporairement par un appel
                if (resumeOnFocusGain && wantsPlayback && playerPrepared && !isPlayerPlaying()) {
                    resumeOnFocusGain = false;
                    try {
                        player.start();
                        state = "playing";
                        handler.removeCallbacks(progressTick);
                        handler.postDelayed(progressTick, 1000L);
                        publishState();
                    } catch (IllegalStateException ignored) {}
                }
                break;
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        audioManager = (AudioManager) getSystemService(AUDIO_SERVICE);
        mediaSession = new MediaSession(this, "HearLocalMusic");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { play(); }
            @Override public void onPause() { pause(); }
            @Override public void onSkipToNext() { next(); }
            @Override public void onSkipToPrevious() { previous(); }
            @Override public void onSeekTo(long position) { seek(position); }
        });
        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) return START_NOT_STICKY;
        String action = intent.getAction();
        switch (action) {
            case ACTION_START:
                readQueue(intent);
                index = Math.max(0, Math.min(intent.getIntExtra(EXTRA_INDEX, 0), uris.size() - 1));
                repeatMode = intent.getStringExtra(EXTRA_REPEAT) == null ? "none" : intent.getStringExtra(EXTRA_REPEAT);
                wantsPlayback = true;
                startCurrent(true);
                break;
            case ACTION_TOGGLE:
                if (wantsPlayback) pause(); else play();
                break;
            case ACTION_PAUSE:
                pause();
                break;
            case ACTION_NEXT:
                next();
                break;
            case ACTION_PREVIOUS:
                previous();
                break;
            case ACTION_SEEK:
                seek(intent.getLongExtra(EXTRA_POSITION, 0L));
                break;
            case ACTION_REPEAT:
                repeatMode = intent.getStringExtra(EXTRA_REPEAT) == null ? "none" : intent.getStringExtra(EXTRA_REPEAT);
                publishState();
                break;
            case ACTION_UPDATE_QUEUE:
                updateQueue(intent);
                break;
            case ACTION_STOP:
                stopPlayback();
                stopSelf();
                break;
        }
        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (!wantsPlayback) stopSelf();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(progressTick);
        abandonAudioFocus();
        releasePlayer();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    private void readQueue(Intent intent) {
        uris.clear();
        titles.clear();
        artists.clear();
        albums.clear();
        ArrayList<String> nextUris = intent.getStringArrayListExtra(EXTRA_URIS);
        ArrayList<String> nextTitles = intent.getStringArrayListExtra(EXTRA_TITLES);
        ArrayList<String> nextArtists = intent.getStringArrayListExtra(EXTRA_ARTISTS);
        ArrayList<String> nextAlbums = intent.getStringArrayListExtra(EXTRA_ALBUMS);
        if (nextUris != null) uris.addAll(nextUris);
        if (nextTitles != null) titles.addAll(nextTitles);
        if (nextArtists != null) artists.addAll(nextArtists);
        if (nextAlbums != null) albums.addAll(nextAlbums);
    }

    private void play() {
        wantsPlayback = true;
        if (player == null && !uris.isEmpty()) {
            startCurrent(true);
            return;
        }
        if (player != null && playerPrepared && !isPlayerPlaying()) {
            if (!requestAudioFocus()) {
                state = "error";
                lastError = "Un autre son utilise la sortie audio.";
                wantsPlayback = false;
                publishState();
                return;
            }
            player.start();
            state = "playing";
            lastError = null;
            handler.removeCallbacks(progressTick);
            handler.postDelayed(progressTick, 1000L);
            publishState();
        }
    }

    private void pause() {
        wantsPlayback = false;
        resumeOnFocusGain = false;
        isDucked = false;
        if (player != null) {
            try { player.setVolume(1.0f, 1.0f); } catch (Exception ignored) {}
        }
        handler.removeCallbacks(progressTick);
        if (isPlayerPlaying()) player.pause();
        abandonAudioFocus();
        if (player != null) state = "paused";
        publishState();
    }

    private void next() {
        if (uris.isEmpty()) return;
        if (index + 1 < uris.size()) {
            index++;
            wantsPlayback = true;
            startCurrent(false);
        } else if ("all".equals(repeatMode)) {
            index = 0;
            wantsPlayback = true;
            startCurrent(false);
        } else {
            wantsPlayback = false;
            handler.removeCallbacks(progressTick);
            abandonAudioFocus();
            state = "ended";
            publishState();
        }
    }

    private void previous() {
        if (playerPrepared && player.getCurrentPosition() > 3000) {
            seek(0);
        } else if (index > 0) {
            index--;
            wantsPlayback = true;
            startCurrent(false);
        } else if ("all".equals(repeatMode) && !uris.isEmpty()) {
            index = uris.size() - 1;
            wantsPlayback = true;
            startCurrent(false);
        } else {
            seek(0);
        }
    }

    private void seek(long position) {
        if (player == null || !playerPrepared) return;
        int bounded = (int) Math.max(0, Math.min(position, player.getDuration()));
        if (Build.VERSION.SDK_INT >= 26) {
            player.seekTo((long) bounded, MediaPlayer.SEEK_CLOSEST);
        } else {
            player.seekTo(bounded);
        }
        player.setOnSeekCompleteListener(mp -> {
            publishState();
            if (wantsPlayback) {
                handler.removeCallbacks(progressTick);
                handler.post(progressTick);
            }
        });
    }

    private void updateQueue(Intent intent) {
        String currentUri = (uris.isEmpty() || index < 0 || index >= uris.size()) ? null : uris.get(index);
        readQueue(intent);
        if (currentUri != null) {
            int newIndex = uris.indexOf(currentUri);
            if (newIndex >= 0) {
                index = newIndex;
            }
        }
        if (intent.hasExtra(EXTRA_REPEAT)) {
            String repeat = intent.getStringExtra(EXTRA_REPEAT);
            if (repeat != null) repeatMode = repeat;
        }
        publishState(true);
    }

    private void startCurrent(boolean foreground) {
        if (uris.isEmpty()) return;
        if (foreground) startForeground(NOTIFICATION_ID, buildNotification());
        if (wantsPlayback && !requestAudioFocus()) {
            state = "error";
            lastError = "Un autre son utilise la sortie audio.";
            wantsPlayback = false;
            if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
            else stopForeground(true);
            publishState();
            return;
        }
        releasePlayer();
        state = "loading";
        lastError = null;
        publishState();
        player = new MediaPlayer();
        playerPrepared = false;
        player.setAudioAttributes(new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build());
        player.setOnPreparedListener(prepared -> {
            if (player != prepared) return;
            playerPrepared = true;
            if (wantsPlayback) {
                prepared.start();
                state = "playing";
                handler.removeCallbacks(progressTick);
                handler.postDelayed(progressTick, 1000L);
            } else {
                state = "paused";
            }
            updateMetadata();
            publishState();
        });
        player.setOnCompletionListener(completed -> {
            if ("one".equals(repeatMode)) {
                completed.seekTo(0);
                completed.start();
                publishState();
            } else {
                next();
            }
        });
        player.setOnErrorListener((failedPlayer, what, extra) -> {
            playerPrepared = false;
            state = "error";
            wantsPlayback = false;
            lastError = "Ce fichier audio ne peut pas être lu sur cet appareil.";
            publishState();
            updateNotification();
            return true;
        });
        try {
            player.setDataSource(this, Uri.parse(uris.get(index)));
            player.prepareAsync();
            updateNotification();
        } catch (IOException | RuntimeException error) {
            playerPrepared = false;
            state = "error";
            wantsPlayback = false;
            lastError = "Impossible d’ouvrir ce fichier audio.";
            publishState();
        }
    }

    private void stopPlayback() {
        wantsPlayback = false;
        handler.removeCallbacks(progressTick);
        abandonAudioFocus();
        releasePlayer();
        state = "idle";
        publishState();
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
    }

    private void releasePlayer() {
        if (player == null) return;
        handler.removeCallbacks(progressTick);
        playerPrepared = false;
        player.setOnPreparedListener(null);
        player.setOnCompletionListener(null);
        player.setOnErrorListener(null);
        try { player.reset(); } catch (IllegalStateException ignored) { }
        player.release();
        player = null;
    }

    private Bitmap getOrLoadArtworkBitmap(String uriStr) {
        if (uriStr == null || uriStr.isEmpty()) return null;
        if (uriStr.equals(cachedArtworkUri) && cachedArtworkBitmap != null) {
            return cachedArtworkBitmap;
        }
        cachedArtworkUri = uriStr;
        cachedArtworkBitmap = loadArtworkBitmap(uriStr);
        return cachedArtworkBitmap;
    }

    private Bitmap loadArtworkBitmap(String uriStr) {
        if (uriStr == null || uriStr.isEmpty()) return null;
        try {
            Uri uri = Uri.parse(uriStr);
            MediaMetadataRetriever mmr = new MediaMetadataRetriever();
            try {
                mmr.setDataSource(this, uri);
                byte[] picture = mmr.getEmbeddedPicture();
                if (picture != null && picture.length > 0) {
                    return BitmapFactory.decodeByteArray(picture, 0, picture.length);
                }
            } finally {
                try { mmr.release(); } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void updateMetadata() {
        if (mediaSession == null || uris.isEmpty()) return;
        // Duration and position are invalid until MediaPlayer reaches Prepared.
        long duration = playerPrepared ? safePlayerDuration() : 0L;
        long position = playerPrepared ? safePlayerPosition() : 0L;
        String trackUri = uris.get(index);
        Bitmap artworkBitmap = getOrLoadArtworkBitmap(trackUri);

        android.media.MediaMetadata.Builder metadataBuilder = new android.media.MediaMetadata.Builder()
            .putString(android.media.MediaMetadata.METADATA_KEY_TITLE, valueAt(titles, index, "Titre local"))
            .putString(android.media.MediaMetadata.METADATA_KEY_ARTIST, valueAt(artists, index, "Artiste inconnu"))
            .putString(android.media.MediaMetadata.METADATA_KEY_ALBUM, valueAt(albums, index, "Album inconnu"))
            .putLong(android.media.MediaMetadata.METADATA_KEY_DURATION, duration);

        if (artworkBitmap != null) {
            metadataBuilder.putBitmap(android.media.MediaMetadata.METADATA_KEY_ALBUM_ART, artworkBitmap);
            metadataBuilder.putBitmap(android.media.MediaMetadata.METADATA_KEY_ART, artworkBitmap);
        }

        mediaSession.setMetadata(metadataBuilder.build());
        mediaSession.setPlaybackState(new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO)
            .setState(wantsPlayback ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, position, 1f)
            .build());
    }

    private void publishState() {
        publishState(true);
    }

    private void publishState(boolean updateNotification) {
        long position = 0L;
        long duration = 0L;
        if (player != null && playerPrepared) {
            try { position = safePlayerPosition(); duration = safePlayerDuration(); }
            catch (IllegalStateException ignored) { }
        }
        if (mediaSession != null && !uris.isEmpty()) updateMetadata();
        Intent event = new Intent(EVENT_ACTION);
        event.setPackage(getPackageName());
        event.putExtra("state", state);
        event.putExtra("trackId", uris.isEmpty() ? "" : uris.get(index));
        event.putExtra("position", position);
        event.putExtra("duration", duration);
        if (lastError != null) event.putExtra("error", lastError);
        sendBroadcast(event);
        if (updateNotification) updateNotification();
    }

    private void updateNotification() {
        if (Build.VERSION.SDK_INT < 24 || player == null || uris.isEmpty()) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null && player != null) manager.notify(NOTIFICATION_ID, buildNotification());
    }

    private Notification buildNotification() {
        String title = valueAt(titles, index, "Hear");
        String artist = valueAt(artists, index, "Musique locale");
        String trackUri = uris.isEmpty() ? null : uris.get(index);
        Bitmap artworkBitmap = getOrLoadArtworkBitmap(trackUri);

        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        builder.setSmallIcon(R.drawable.hear_notification)
            .setContentTitle(title)
            .setContentText(artist)
            .setOnlyAlertOnce(true)
            .setOngoing(wantsPlayback)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(openAppIntent());

        if (artworkBitmap != null) {
            builder.setLargeIcon(artworkBitmap);
        }

        builder.addAction(action(android.R.drawable.ic_media_previous, "Précédent", ACTION_PREVIOUS));
        builder.addAction(action(wantsPlayback ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
            wantsPlayback ? "Pause" : "Lire", ACTION_TOGGLE));
        builder.addAction(action(android.R.drawable.ic_media_next, "Suivant", ACTION_NEXT));
        if (Build.VERSION.SDK_INT >= 21) {
            builder.setStyle(new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));
        }
        return builder.build();
    }

    private Notification.Action action(int icon, String label, String action) {
        Intent intent = new Intent(this, LocalPlaybackService.class).setAction(action);
        int requestCode = action.hashCode();
        PendingIntent pendingIntent = PendingIntent.getService(this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Action.Builder(icon, label, pendingIntent).build();
    }

    private PendingIntent openAppIntent() {
        Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (intent == null) intent = new Intent(this, MainActivity.class);
        return PendingIntent.getActivity(this, 101, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Lecture musicale", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Commandes de lecture de vos fichiers audio locaux");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private boolean requestAudioFocus() {
        if (audioManager == null) return true;
        if (Build.VERSION.SDK_INT >= 26) {
            if (audioFocusRequest == null) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes)
                    .setOnAudioFocusChangeListener(focusListener, handler)
                    .setWillPauseWhenDucked(false)
                    .build();
            }
            return audioManager.requestAudioFocus(audioFocusRequest) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
        return audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN)
            == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void abandonAudioFocus() {
        resumeOnFocusGain = false;
        isDucked = false;
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= 26 && audioFocusRequest != null) audioManager.abandonAudioFocusRequest(audioFocusRequest);
        else if (Build.VERSION.SDK_INT < 26) audioManager.abandonAudioFocus(focusListener);
    }

    private String valueAt(ArrayList<String> values, int position, String fallback) {
        return position >= 0 && position < values.size() && values.get(position) != null
            ? values.get(position)
            : fallback;
    }

    private boolean isPlayerPlaying() {
        if (player == null || !playerPrepared) return false;
        try { return player.isPlaying(); }
        catch (IllegalStateException ignored) { return false; }
    }

    private long safePlayerDuration() {
        if (player == null || !playerPrepared) return 0L;
        try { return Math.max(0, player.getDuration()); }
        catch (IllegalStateException ignored) { return 0L; }
    }

    private long safePlayerPosition() {
        if (player == null || !playerPrepared) return 0L;
        try { return Math.max(0, player.getCurrentPosition()); }
        catch (IllegalStateException ignored) { return 0L; }
    }
}
