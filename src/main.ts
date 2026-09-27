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
const initial = createNewGame(data, now >>> 0, now);
const store = createStore(data, initial, dispatch, () => Date.now());

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
createEffects(app, boardView, store);
