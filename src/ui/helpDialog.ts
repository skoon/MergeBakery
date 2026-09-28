/**
 * "?" button in the tray and the How to play dialog it opens.
 *
 * A native <dialog> opened with showModal(): Escape, focus trapping, and the
 * backdrop come free, so the only extra behaviour here is closing on a
 * backdrop click.
 */

import './helpDialog.css';
import type { GameStore } from './store';

interface HelpSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

function helpSections(store: GameStore): readonly HelpSection[] {
  const perTap = store.data.economy.energy.perTap;
  const energyCost = perTap === 1 ? '1 energy' : `${perTap.toString()} energy`;

  return [
    {
      heading: 'Merge two of the same',
      paragraphs: [
        'Drag an item on top of another item just like it. The pair becomes one item of the next tier up, and the cell you dragged from empties.',
        'Only matching items merge: two Wheat Stalks make a Wheat Bundle, two Wheat Bundles make a Flour Scoop, and so on up the chain. Items from different chains never merge.',
        'The Golden Whisk is the exception. Merge it onto any ingredient or baked item and it becomes a second copy of that item.',
      ],
    },
    {
      heading: 'Make more items',
      paragraphs: [
        `Tap a generator, such as the Flour Mill or the Dairy Fridge, to drop a fresh ingredient on the board. Each tap spends ${energyCost} and one of the generator's charges; when the charges run out it rests for a while before refilling.`,
        'Merging generators up makes them better: more charges, a shorter rest, and a chance at higher-tier ingredients.',
        'Tap an energy jar or a coin pouch to collect it straight away.',
      ],
    },
    {
      heading: 'Clear the board',
      paragraphs: [
        'Drag an item onto Sell to turn it into coins. You get a moment to undo it if you change your mind.',
        'Drag an item onto the Pantry to set it aside. Pantry items keep their place until you drag them back out, which is handy when the board fills up.',
      ],
    },
    {
      heading: 'Baking',
      paragraphs: [
        'Tap Oven in the middle of the tray to open the Kitchen. Each recipe shows the ingredients it needs, with a tick on the ones already on your board. When they are all there, press Send to Oven and they go in together.',
        'Shortcut: drag an ingredient onto the Oven button. If the rest of a recipe is on the board, it starts baking straight away; if not, the Kitchen opens so you can see what is missing.',
        'The ring around the Oven button fills as a bake cooks, and a number appears when something is ready. Press Collect to put it on the board, or spend gems to Rush a bake that is still cooking.',
        'Two ovens of the same kind can be upgraded into a bigger one with more slots and shorter bake times.',
      ],
    },
  ];
}

export function mountHelpDialog(
  tray: HTMLElement,
  overlayRoot: HTMLElement,
  store: GameStore,
): void {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-toggle';
  button.textContent = '?';
  button.setAttribute('aria-label', 'How to play');
  tray.appendChild(button);

  const dialog = document.createElement('dialog');
  dialog.className = 'help-dialog';

  const title = document.createElement('h2');
  title.className = 'help-dialog__title';
  title.textContent = 'How to play';
  dialog.appendChild(title);

  for (const section of helpSections(store)) {
    const heading = document.createElement('h3');
    heading.className = 'help-dialog__heading';
    heading.textContent = section.heading;
    dialog.appendChild(heading);

    for (const text of section.paragraphs) {
      const paragraph = document.createElement('p');
      paragraph.className = 'help-dialog__text';
      paragraph.textContent = text;
      dialog.appendChild(paragraph);
    }
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'help-dialog__close';
  close.textContent = 'Got it';
  close.addEventListener('click', () => {
    dialog.close();
  });
  dialog.appendChild(close);

  // A click that lands on the dialog element itself is a click on the backdrop:
  // the content is all in children.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  button.addEventListener('click', () => {
    dialog.showModal();
  });

  overlayRoot.appendChild(dialog);
}
