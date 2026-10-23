// Extra behaviour when the site runs inside the Android app (Capacitor).
import { Capacitor } from '@capacitor/core';

export async function setupNativeApp() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add('native-app');
  const { App } = await import('@capacitor/app');
  // Android back button: go back inside the app, and close it only from the first screen
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.location.hash && window.location.hash !== '#/') window.history.back();
    else App.exitApp();
  });
}
