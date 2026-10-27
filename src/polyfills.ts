/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

import '_requestAnimationFrame.polyfill';

/***************************************************************************************************
 * Zone JS is required by Angular itself.
 */
import 'zone.js'; // Included with Angular CLI.

(window as any).global = window;
(window as any).process = {
  env: { DEBUG: undefined },
};
