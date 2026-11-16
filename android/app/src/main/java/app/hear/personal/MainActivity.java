package app.hear.personal;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LocalMusicPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
