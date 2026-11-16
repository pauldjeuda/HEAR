package app.hear.personal;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Size;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "LocalMusic",
    permissions = {
        @Permission(alias = "audio", strings = {Manifest.permission.READ_MEDIA_AUDIO}),
        @Permission(alias = "legacyAudio", strings = {Manifest.permission.READ_EXTERNAL_STORAGE})
    }
)
public class LocalMusicPlugin extends Plugin {
    private static final String PLAYBACK_EVENT = "app.hear.personal.PLAYBACK_EVENT";
    private BroadcastReceiver playbackReceiver;

    @Override
    public void load() {
        playbackReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                JSObject event = new JSObject();
                event.put("state", intent.getStringExtra("state"));
                event.put("trackId", intent.getStringExtra("trackId"));
                event.put("position", intent.getLongExtra("position", 0L));
                event.put("duration", intent.getLongExtra("duration", 0L));
                String error = intent.getStringExtra("error");
                if (error != null) event.put("error", error);
                notifyListeners("playbackState", event);
            }
        };
        IntentFilter filter = new IntentFilter(PLAYBACK_EVENT);
        if (Build.VERSION.SDK_INT >= 33) {
            getContext().registerReceiver(playbackReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(playbackReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (playbackReceiver != null) {
            try {
                getContext().unregisterReceiver(playbackReceiver);
            } catch (IllegalArgumentException ignored) {
                // The bridge may have already released its receiver.
            }
        }
    }

    @PluginMethod
    public void hasAccess(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasAudioPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void requestAccess(PluginCall call) {
        if (hasAudioPermission()) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias(Build.VERSION.SDK_INT >= 33 ? "audio" : "legacyAudio", call, "audioPermissionResult");
    }

    @PermissionCallback
    private void audioPermissionResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasAudioPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void scan(PluginCall call) {
        if (!hasAudioPermission()) {
            call.reject("L’accès aux fichiers audio du téléphone n’est pas autorisé.", "AUDIO_PERMISSION_REQUIRED");
            return;
        }

        ArrayList<JSObject> tracks = new ArrayList<>();
        Uri collection = Build.VERSION.SDK_INT >= 29
            ? MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
            : MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.MIME_TYPE,
            MediaStore.Audio.Media.DATE_MODIFIED,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.IS_MUSIC,
            MediaStore.Audio.Media.ALBUM_ID
        };
        String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0 AND " + MediaStore.Audio.Media.DURATION + " > 0";

        try (Cursor cursor = getContext().getContentResolver().query(
            collection,
            projection,
            selection,
            null,
            MediaStore.Audio.Media.TITLE + " COLLATE NOCASE ASC"
        )) {
            if (cursor != null) {
                int idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                int artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                int albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM);
                int durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                int sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE);
                int mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE);
                int modifiedColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED);
                int nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
                int albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID);

                while (cursor.moveToNext()) {
                    long id = cursor.getLong(idColumn);
                    String fileName = cursor.getString(nameColumn);
                    String title = cursor.getString(titleColumn);
                    if (title == null || title.trim().isEmpty()) title = fileName == null ? "Titre sans nom" : fileName;
                    String artist = cursor.getString(artistColumn);
                    String album = cursor.getString(albumColumn);
                    long albumId = cursor.getLong(albumIdColumn);
                    JSObject track = new JSObject();
                    String mediaUri = ContentUris.withAppendedId(collection, id).toString();
                    track.put("id", mediaUri);
                    track.put("uri", mediaUri);
                    track.put("title", title);
                    track.put("artist", artist == null || artist.equals("<unknown>") ? "Artiste inconnu" : artist);
                    track.put("album", album == null || album.equals("<unknown>") ? "Album inconnu" : album);
                    track.put("albumId", String.valueOf(albumId));
                    track.put("duration", cursor.getLong(durationColumn));
                    track.put("size", cursor.getLong(sizeColumn));
                    track.put("mimeType", cursor.getString(mimeColumn));
                    track.put("modifiedAt", cursor.getLong(modifiedColumn) * 1000L);
                    tracks.add(track);
                }
            }
        } catch (SecurityException error) {
            call.reject("Android n’a pas autorisé la lecture de la bibliothèque audio.", "AUDIO_PERMISSION_REQUIRED", error);
            return;
        } catch (RuntimeException error) {
            call.reject("La bibliothèque audio du téléphone n’a pas pu être analysée.", "AUDIO_SCAN_FAILED", error);
            return;
        }

        JSObject result = new JSObject();
        JSArray values = new JSArray();
        for (JSObject track : tracks) values.put(track);
        result.put("tracks", values);
        result.put("scannedAt", System.currentTimeMillis());
        call.resolve(result);
    }

    @PluginMethod
    public void getArtwork(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null || uriString.isEmpty()) {
            JSObject empty = new JSObject();
            empty.put("artwork", (String) null);
            call.resolve(empty);
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);

            // 1. Essayer d'extraire la pochette intégrée via MediaMetadataRetriever
            MediaMetadataRetriever mmr = new MediaMetadataRetriever();
            try {
                mmr.setDataSource(getContext(), uri);
                byte[] picture = mmr.getEmbeddedPicture();
                if (picture != null && picture.length > 0) {
                    String base64 = Base64.encodeToString(picture, Base64.NO_WRAP);
                    JSObject res = new JSObject();
                    res.put("artwork", "data:image/jpeg;base64," + base64);
                    call.resolve(res);
                    return;
                }
            } catch (Exception ignored) {
            } finally {
                try { mmr.release(); } catch (Exception ignored) {}
            }

            // 2. Sur Android 10+ (API 29+), charger le thumbnail via ContentResolver
            if (Build.VERSION.SDK_INT >= 29) {
                try {
                    Bitmap thumbnail = getContext().getContentResolver().loadThumbnail(
                        uri, new Size(512, 512), null
                    );
                    if (thumbnail != null) {
                        ByteArrayOutputStream stream = new ByteArrayOutputStream();
                        thumbnail.compress(Bitmap.CompressFormat.JPEG, 85, stream);
                        String base64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP);
                        JSObject res = new JSObject();
                        res.put("artwork", "data:image/jpeg;base64," + base64);
                        call.resolve(res);
                        return;
                    }
                } catch (Exception ignored) {
                }
            }

            // 3. Essayer via l'album art MediaStore hérité
            String albumId = call.getString("albumId");
            if (albumId != null && !albumId.isEmpty()) {
                try {
                    Uri albumArtUri = ContentUris.withAppendedId(
                        Uri.parse("content://media/external/audio/albumart"),
                        Long.parseLong(albumId)
                    );
                    try (InputStream is = getContext().getContentResolver().openInputStream(albumArtUri)) {
                        if (is != null) {
                            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                            byte[] data = new byte[8192];
                            int nRead;
                            while ((nRead = is.read(data, 0, data.length)) != -1) {
                                buffer.write(data, 0, nRead);
                            }
                            String base64 = Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP);
                            JSObject res = new JSObject();
                            res.put("artwork", "data:image/jpeg;base64," + base64);
                            call.resolve(res);
                            return;
                        }
                    }
                } catch (Exception ignored) {
                }
            }
        } catch (Exception ignored) {
        }

        JSObject empty = new JSObject();
        empty.put("artwork", (String) null);
        call.resolve(empty);
    }

    @PluginMethod
    public void play(PluginCall call) {
        JSArray queue = call.getArray("queue");
        if (queue == null || queue.length() == 0) {
            call.reject("La file de lecture est vide.");
            return;
        }
        ArrayList<String> uris = new ArrayList<>();
        ArrayList<String> titles = new ArrayList<>();
        ArrayList<String> artists = new ArrayList<>();
        ArrayList<String> albums = new ArrayList<>();
        try {
            for (int index = 0; index < queue.length(); index++) {
                JSONObject item = queue.getJSONObject(index);
                uris.add(item.getString("uri"));
                titles.add(item.optString("title", "Titre local"));
                artists.add(item.optString("artist", "Artiste inconnu"));
                albums.add(item.optString("album", "Album inconnu"));
            }
        } catch (JSONException error) {
            call.reject("La file de lecture est invalide.", error);
            return;
        }

        Intent intent = new Intent(getContext(), LocalPlaybackService.class);
        intent.setAction(LocalPlaybackService.ACTION_START);
        intent.putStringArrayListExtra(LocalPlaybackService.EXTRA_URIS, uris);
        intent.putStringArrayListExtra(LocalPlaybackService.EXTRA_TITLES, titles);
        intent.putStringArrayListExtra(LocalPlaybackService.EXTRA_ARTISTS, artists);
        intent.putStringArrayListExtra(LocalPlaybackService.EXTRA_ALBUMS, albums);
        intent.putExtra(LocalPlaybackService.EXTRA_INDEX, call.getInt("index", 0));
        intent.putExtra(LocalPlaybackService.EXTRA_REPEAT, call.getString("repeatMode", "none"));
        startService(intent);
        call.resolve();
    }

    @PluginMethod public void toggle(PluginCall call) { dispatch(LocalPlaybackService.ACTION_TOGGLE, call); }
    @PluginMethod public void pause(PluginCall call) { dispatch(LocalPlaybackService.ACTION_PAUSE, call); }
    @PluginMethod public void next(PluginCall call) { dispatch(LocalPlaybackService.ACTION_NEXT, call); }
    @PluginMethod public void previous(PluginCall call) { dispatch(LocalPlaybackService.ACTION_PREVIOUS, call); }
    @PluginMethod public void stop(PluginCall call) { dispatch(LocalPlaybackService.ACTION_STOP, call); }

    @PluginMethod
    public void seek(PluginCall call) {
        Intent intent = new Intent(getContext(), LocalPlaybackService.class);
        intent.setAction(LocalPlaybackService.ACTION_SEEK);
        long pos = 0L;
        if (call.getData().has("position")) {
            pos = call.getData().optLong("position", 0L);
        } else {
            pos = call.getLong("position", 0L);
        }
        intent.putExtra(LocalPlaybackService.EXTRA_POSITION, pos);
        startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void updateQueue(PluginCall call) {
        JSArray queue = call.getArray("queue");
        if (queue == null) {
            call.reject("Une file d'attente est requise.");
            return;
        }
        ArrayList<String> uris = new ArrayList<>();
        ArrayList<String> titles = new ArrayList<>();
        ArrayList<String> artists = new ArrayList<>();
        ArrayList<String> albums = new ArrayList<>();
        try {
            for (int i = 0; i < queue.length(); i++) {
                JSObject item = JSObject.fromJSONObject(queue.getJSONObject(i));
                uris.add(item.getString("uri", ""));
                titles.add(item.getString("title", "Titre local"));
                artists.add(item.getString("artist", "Artiste inconnu"));
                albums.add(item.getString("album", "Album inconnu"));
            }
        } catch (JSONException error) {
            call.reject("La file d'attente est invalide.", error);
            return;
        }

        Intent intent = new Intent(getContext(), LocalPlaybackService.class);
        intent.setAction(LocalPlaybackService.ACTION_UPDATE_QUEUE);
        intent.putStringArrayListExtra(LocalPlaybackService.EXTRA_URIS, uris);
        intent.putStringArrayListExtra(LocalPlaybackService.EXTRA_TITLES, titles);
        intent.putStringArrayListExtra(LocalPlaybackService.EXTRA_ARTISTS, artists);
        intent.putStringArrayListExtra(LocalPlaybackService.EXTRA_ALBUMS, albums);
        if (call.hasOption("repeatMode")) {
            intent.putExtra(LocalPlaybackService.EXTRA_REPEAT, call.getString("repeatMode", "none"));
        }
        startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void setRepeatMode(PluginCall call) {
        Intent intent = new Intent(getContext(), LocalPlaybackService.class);
        intent.setAction(LocalPlaybackService.ACTION_REPEAT);
        intent.putExtra(LocalPlaybackService.EXTRA_REPEAT, call.getString("mode", "none"));
        startService(intent);
        call.resolve();
    }

    private void dispatch(String action, PluginCall call) {
        Intent intent = new Intent(getContext(), LocalPlaybackService.class);
        intent.setAction(action);
        startService(intent);
        call.resolve();
    }

    private boolean hasAudioPermission() {
        String permission = Build.VERSION.SDK_INT >= 33
            ? Manifest.permission.READ_MEDIA_AUDIO
            : Manifest.permission.READ_EXTERNAL_STORAGE;
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private void startService(Intent intent) {
        if (Build.VERSION.SDK_INT >= 26 && LocalPlaybackService.ACTION_START.equals(intent.getAction())) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
    }
}
