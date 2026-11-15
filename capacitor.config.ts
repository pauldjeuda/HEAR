import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.hear.personal',
  appName: 'Hear',
  webDir: 'dist/hear/browser',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#FAF9F6',
    },
    StatusBar: {
      backgroundColor: '#FAF9F6',
      style: 'DARK',
    },
  },
};

export default config;
