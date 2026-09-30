import './ui/tokens.css';
import './ui/app.css';
import { registerSW } from 'virtual:pwa-register';
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
import { createRouter } from './ui/router';
import { mountNavBar } from './ui/navBar';
import { mountTutorialHints } from './ui/tutorialHints';
import { catchUpTutorial } from './core/tutorial';
import { mountRecipeBook } from './ui/recipeBook';
import { mountLocationView } from './ui/locationView';
import { mountDiscoveryCard } from './ui/discoveryCard';
import { parseScenes } from './ui/dialogue';
import { mountDialoguePlayer } from './ui/dialoguePlayer';
import chapter1Scenes from './data/dialogue/chapter1.json';
import { startBakeNotifier } from './ui/bakeNotifier';
import { createSettingsStore } from './ui/settings';
import { mountSettings } from './ui/settingsScreen';
import { createAudioManager } from './audio/audioManager';
import { startMergeChime } from './audio/mergeChime';
import { parseSfx, startSfx } from './audio/sfx';
import sfxData from './data/sfx.json';

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
const nav = requireElement('#nav');
const screensRoot = requireElement('#screens');

// Offline play and installing (T5.13). With autoUpdate, a new version takes over
// on the next load; saves live in localStorage, which an update never touches.
void registerSW({ immediate: true });

const data = loadGameData();
const now = Date.now();
const saved = readSave(localStorage, data, now);
const caughtUp = saved
  ? resolveOffline(data, saved.state, saved.savedAt, now)
  : null;
const initial = caughtUp ? caughtUp.state : createNewGame(data, now >>> 0, now);
const store = createStore(data, initial, dispatch, () => Date.now());

// Settings apply at once (T5.9). Text size scales every font from one variable.
const settings = createSettingsStore(localStorage);
function applyTextScale(): void {
  document.documentElement.style.setProperty(
    '--text-scale',
    settings.get().textScale.toString(),
  );
}
settings.subscribe(applyTextScale);
applyTextScale();

const stopAutosave = startAutosave(
  store,
  (state) => void writeSave(localStorage, state, Date.now()),
  {
    delayMs: 500,
    onHide: onPageHide,
  },
);

const app = await createPixiApp(stage);
const boardView = await createBoardView(app, store, settings);

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
mountDiscoveryCard(overlayRoot, store, settings);

// Story scenes (T5.5): the chapter intro on a new game, and a scene when a
// renovation task that has one completes. The player queues them.
const dialogue = mountDialoguePlayer(
  overlayRoot,
  data,
  parseScenes(data, chapter1Scenes),
);
store.subscribe((state, events) => {
  const chapter = data.chapters.get(state.chapterId);
  for (const event of events) {
    if (event.type !== 'taskCompleted') continue;
    const sceneId = chapter?.tasks.find((t) => t.id === event.taskId)?.sceneId;
    if (sceneId) void dialogue.play(sceneId);
  }
});
const introSceneId = data.chapters.get(initial.chapterId)?.introSceneId;
if (!saved && introSceneId) {
  void dialogue.play(introSceneId);
}

/** Placeholder until the screen's own task lands. */
function comingSoon(container: HTMLElement): void {
  const note = document.createElement('p');
  note.className = 'screen__coming-soon';
  note.textContent = 'Coming soon';
  container.appendChild(note);
}

const router = createRouter();
mountNavBar(nav, screensRoot, router, [
  {
    id: 'recipeBook',
    label: 'Recipes',
    mount: (container) => {
      mountRecipeBook(container, store);
    },
  },
  {
    id: 'bakery',
    label: 'Bakery',
    mount: (container) => {
      mountLocationView(container, store, settings);
    },
  },
  { id: 'shop', label: 'Shop', mount: comingSoon },
  {
    id: 'settings',
    label: 'Settings',
    mount: (container) => {
      mountSettings(container, settings, stopAutosave);
    },
  },
]);

// First-time flow (T5.12). A save from before the tutorial existed skips it
// once the player is clearly past the basics.
if (saved) {
  const step = catchUpTutorial(store.getState());
  if (step !== store.getState().tutorialStep) {
    store.dispatch({ type: 'setTutorialStep', step });
  }
}
mountTutorialHints(overlayRoot, store, boardView, router);
startBakeNotifier(store, () => Date.now(), {
  isHidden: () => document.visibilityState === 'hidden',
  notificationsOn: () =>
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted' &&
    settings.get().notifications,
  notify: (title) => {
    new Notification(title);
  },
});

if (caughtUp && shouldShowAwayCard(caughtUp.summary)) {
  showAwayCard(overlayRoot, data, caughtUp.summary);
}
createEffects(app, boardView, store, settings);

// Browsers keep audio muted until the player interacts with the page.
const audio = createAudioManager();
document.addEventListener('pointerdown', () => {
  audio.unlock();
});
function applyVolumes(): void {
  audio.setVolumes(settings.get().musicVolume, settings.get().effectsVolume);
}
settings.subscribe(applyVolumes);
applyVolumes();
startMergeChime(store, audio);
startSfx(store, audio, () => Date.now(), parseSfx(sfxData));

// Console helpers for testing; a dynamic import keeps them out of production builds.
if (import.meta.env.DEV) {
  const { installDevTools } = await import('./ui/devTools');
  installDevTools(store, stopAutosave);
}
