/**
 * The Settings screen (T5.9). Every change applies at once and is saved.
 */

import './settingsScreen.css';
import { SAVE_KEY } from './saveStorage';
import type { SettingsStore, TextScale } from './settings';

function row(label: string, control: HTMLElement): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'settings-row';
  const text = document.createElement('span');
  text.className = 'settings-row__label';
  text.textContent = label;
  wrapper.append(text, control);
  return wrapper;
}

function slider(
  settings: SettingsStore,
  key: 'musicVolume' | 'effectsVolume',
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'settings-slider';
  input.min = '0';
  input.max = '100';
  input.value = String(Math.round(settings.get()[key] * 100));
  input.addEventListener('input', () => {
    settings.update({ [key]: Number(input.value) / 100 });
  });
  return input;
}

function toggle(
  settings: SettingsStore,
  key: 'reducedMotion' | 'tierNumbers',
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'settings-switch';
  input.checked = settings.get()[key];
  input.addEventListener('change', () => {
    settings.update({ [key]: input.checked });
  });
  return input;
}

/**
 * Bake notifications need the browser's permission as well as the setting.
 * Turning it on asks when permission isn't already granted, and switches back
 * off when refused. Null when the browser has no Notification API.
 */
function notificationToggle(settings: SettingsStore): HTMLInputElement | null {
  if (typeof Notification === 'undefined') return null;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'settings-switch';
  input.checked =
    settings.get().notifications && Notification.permission === 'granted';
  input.addEventListener('change', () => {
    void (async () => {
      let on = input.checked;
      if (on && Notification.permission !== 'granted') {
        on = (await Notification.requestPermission()) === 'granted';
      }
      input.checked = on;
      settings.update({ notifications: on });
    })();
  });
  return input;
}

function textSizeButtons(settings: SettingsStore): HTMLElement {
  const group = document.createElement('div');
  group.className = 'settings-segmented';
  group.setAttribute('role', 'radiogroup');

  const scales: TextScale[] = [1, 1.25, 1.5];
  const buttons = scales.map((scale) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings-segmented__option';
    button.setAttribute('role', 'radio');
    button.textContent = `${(scale * 100).toString()}%`;
    button.addEventListener('click', () => {
      settings.update({ textScale: scale });
    });
    group.appendChild(button);
    return { scale, button };
  });

  function sync(): void {
    for (const { scale, button } of buttons) {
      button.setAttribute(
        'aria-checked',
        String(settings.get().textScale === scale),
      );
    }
  }
  settings.subscribe(sync);
  sync();
  return group;
}

function startOver(stopAutosave: () => void): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'settings-start-over';
  button.textContent = 'Start over';

  const dialog = document.createElement('dialog');
  dialog.className = 'settings-confirm';
  const message = document.createElement('p');
  message.textContent =
    'Start over? Your bakery, items and progress will be deleted. Your settings are kept.';
  const actions = document.createElement('div');
  actions.className = 'settings-confirm__actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'settings-confirm__cancel';
  cancel.textContent = 'Cancel';
  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'settings-confirm__delete';
  confirm.textContent = 'Delete and start over';
  actions.append(cancel, confirm);
  dialog.append(message, actions);

  button.addEventListener('click', () => {
    dialog.showModal();
  });
  cancel.addEventListener('click', () => {
    dialog.close();
  });
  confirm.addEventListener('click', () => {
    // Stop first, or the old game is saved again on the way out.
    stopAutosave();
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'settings-danger';
  wrapper.append(button, dialog);
  return wrapper;
}

export function mountSettings(
  container: HTMLElement,
  settings: SettingsStore,
  stopAutosave: () => void,
): void {
  const list = document.createElement('div');
  list.className = 'settings-list';

  list.append(
    row('Music', slider(settings, 'musicVolume')),
    row('Effects', slider(settings, 'effectsVolume')),
    row('Reduced motion', toggle(settings, 'reducedMotion')),
    row('Tier numbers', toggle(settings, 'tierNumbers')),
  );
  const notifications = notificationToggle(settings);
  if (notifications) {
    list.appendChild(row('Bake notifications', notifications));
  }

  const textSize = document.createElement('div');
  textSize.className = 'settings-row';
  const textLabel = document.createElement('span');
  textLabel.className = 'settings-row__label';
  textLabel.textContent = 'Text size';
  textSize.append(textLabel, textSizeButtons(settings));
  list.appendChild(textSize);

  container.append(list, startOver(stopAutosave));
}
