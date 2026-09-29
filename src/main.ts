import './ui/tokens.css';
import './ui/app.css';
import { dispatch } from './core/dispatch';
import { loadGameData } from './core/data';
import { createNewGame } from './core/newGame';
import { createPixiApp } from './render/app';
import { createBoardView } from './render/boardView';
import { createEffects } from './render/effects';
import { createStore } from './ui/store';
import { mountPantryDrawer } from './ui/pantryDrawer';
import { mountSellBin } from './ui/sellBin';
import { mountHud } from './ui/hud';
import { mountCounterStrip } from './ui/counterStrip';
import { mountHelpDialog } from './ui/helpDialog';
import { startAutosave, onPageHide } from './ui/autosave';
import { readSave, writeSave } from './ui/saveStorage';
import { resolveOffline, shouldShowAwayCard } from './core/offline';
import { showAwayCard } from './ui/awayCard';
import { mountKitchen } from './ui/kitchenSheet';
import { startBakeNotifier } from './ui/bakeNotifier';
import { readSettings } from './ui/settings';

function requireElement<T extends HTMLElement = HTMLElement>(
  selector: string,
): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`index.html is missing the ${selector} element`);
  }
  return element;
}

const stage = requireElement('#stage');
const overlayRoot = requireElement('#overlay-root');
const hud = requireElement('#hud');
const counter = requireElement('#counter');
const tray = requireElement('#tray');

const data = loadGameData();
const now = Date.now();
const saved = readSave(localStorage, data, now);
const caughtUp = saved
  ? resolveOffline(data, saved.state, saved.savedAt, now)
  : null;
const initial = caughtUp ? caughtUp.state : createNewGame(data, now >>> 0, now);
const store = createStore(data, initial, dispatch, () => Date.now());

const stopAutosave = startAutosave(
  store,
  (state) => void writeSave(localStorage, state, Date.now()),
  {
    delayMs: 500,
    onHide: onPageHide,
  },
);

const app = await createPixiApp(stage);
const boardView = await createBoardView(app, store);

setInterval(() => {
  store.dispatch({ type: 'tick' });
}, 1000);

// UI mounts
mountPantryDrawer(tray, overlayRoot, store, boardView);
mountHud(hud, store, () => Date.now());
mountSellBin(tray, store);
mountCounterStrip(counter, store);
mountHelpDialog(tray, overlayRoot, store);
mountKitchen(tray, overlayRoot, store, () => Date.now());
startBakeNotifier(store, () => Date.now(), {
  isHidden: () => document.visibilityState === 'hidden',
  notificationsOn: () =>
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted' &&
    readSettings(localStorage).notifications,
  notify: (title) => {
    new Notification(title);
  },
});

if (caughtUp && shouldShowAwayCard(caughtUp.summary)) {
  showAwayCard(overlayRoot, data, caughtUp.summary);
}
createEffects(app, boardView, store);

// Console helpers for testing; a dynamic import keeps them out of production builds.
if (import.meta.env.DEV) {
  const { installDevTools } = await import('./ui/devTools');
  installDevTools(store, stopAutosave);
}
