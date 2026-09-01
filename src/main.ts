import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig)
  .then(() => {
    // Register the service worker after bootstrap so it never competes with the
    // initial render for bandwidth.
    //
    // Gated on dev mode rather than on the hostname: `ng serve` skips it (a
    // stale cache while editing is pure nuisance), but a production build
    // served locally — `npm run preview` — registers it, so offline behaviour
    // can be verified before it reaches users.
    if (isDevMode() || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline support is a progressive enhancement — failing to register
        // must never break the app.
      });
    };

    // Bootstrap frequently finishes after `load` has already fired, and a
    // listener added then would never run — leaving the worker unregistered.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  })
  .catch((err) => console.error(err));
