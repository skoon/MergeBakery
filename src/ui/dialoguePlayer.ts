/**
 * Plays story scenes as a portrait and a text box the player taps through
 * (T5.4). Scenes queue: a play() while one runs waits its turn.
 */

import './dialoguePlayer.css';
import { setImageArt } from '../render/assets';
import type { GameData, SceneId } from '../core/types';
import { speakerView, type Scene } from './dialogue';

export interface DialoguePlayer {
  /**
   * Plays a scene; resolves when its last line is dismissed or it's skipped.
   * A play() while another scene runs waits its turn. An unknown id logs
   * console.error and resolves at once.
   */
  play(sceneId: SceneId): Promise<void>;
  isPlaying(): boolean;
}

export function mountDialoguePlayer(
  overlayRoot: HTMLElement,
  data: GameData,
  scenes: ReadonlyMap<SceneId, Scene>,
): DialoguePlayer {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialogue';
  backdrop.hidden = true;

  const box = document.createElement('div');
  box.className = 'dialogue__box';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-live', 'polite');

  const portrait = document.createElement('img');
  portrait.className = 'dialogue__portrait';
  portrait.alt = '';

  const content = document.createElement('div');
  content.className = 'dialogue__content';
  const name = document.createElement('p');
  name.className = 'dialogue__name';
  const text = document.createElement('p');
  text.className = 'dialogue__text';
  const hint = document.createElement('p');
  hint.className = 'dialogue__hint';
  hint.textContent = 'Tap to continue';
  content.append(name, text, hint);

  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'dialogue__skip';
  skip.textContent = 'Skip';

  box.append(portrait, content, skip);
  backdrop.appendChild(box);
  overlayRoot.appendChild(backdrop);

  const queue: { scene: Scene; done: () => void }[] = [];
  let current: { scene: Scene; done: () => void; line: number } | null = null;

  function showLine(): void {
    if (!current) return;
    const line = current.scene.lines[current.line];
    if (!line) return;
    const view = speakerView(data, line);

    name.textContent = view.name ?? '';
    name.hidden = view.name === null;
    text.textContent = line.text;
    box.dataset['narrator'] = String(line.speaker === 'narrator');
    if (view.portraitKey) {
      portrait.hidden = false;
      setImageArt(portrait, view.portraitKey);
    } else {
      portrait.hidden = true;
    }
  }

  function startNext(): void {
    const next = queue.shift();
    if (!next) {
      current = null;
      backdrop.hidden = true;
      return;
    }
    current = { ...next, line: 0 };
    backdrop.hidden = false;
    showLine();
  }

  function finish(): void {
    const done = current?.done;
    current = null;
    done?.();
    startNext();
  }

  function advance(): void {
    if (!current) return;
    current.line++;
    if (current.line >= current.scene.lines.length) {
      finish();
    } else {
      showLine();
    }
  }

  backdrop.addEventListener('click', advance);
  skip.addEventListener('click', (event) => {
    event.stopPropagation();
    finish();
  });
  document.addEventListener('keydown', (event) => {
    if (current && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      advance();
    }
  });

  return {
    play(sceneId) {
      const scene = scenes.get(sceneId);
      if (!scene) {
        console.error(`DialoguePlayer: unknown scene "${sceneId}"`);
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        queue.push({ scene, done: resolve });
        if (!current) startNext();
      });
    },
    isPlaying: () => current !== null,
  };
}
