/**
 * UI check (T-R6): opens every screen at every viewport and text size, saves a screenshot
 * of each under docs/ui-checks/, and reports text that is clipped, off screen or overlapping.
 *
 *   npm run dev                                        (leave it running)
 *   npx -y -p playwright playwright install chromium   (once)
 *   npm run ui-check -- [url] [only]
 *
 * `only` filters the runs, for example `320x568` or `@1.5`. Playwright is not a dependency
 * of the game: npx puts it on the PATH, and it is loaded from there. The game is driven
 * through the `bakery` console helpers (src/ui/devTools.ts), so this needs the dev server.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const VIEWPORTS = [
  [320, 568],
  [360, 740],
  [412, 915],
  [768, 1024],
  [1280, 720],
];
const TEXT_SCALES = [1, 1.25, 1.5];
const OUT = 'docs/ui-checks';
/** The plan's floor (D2): the chrome may grow until the board has half the height. */
const MIN_BOARD_SHARE = 0.5;

const args = process.argv.slice(2);
const url =
  args.find((a) => a.startsWith('http')) ??
  'http://localhost:5173/MergeBakery/';
const only = args.find((a) => !a.startsWith('http')) ?? '';

const playwrightPath = (process.env.PATH ?? '')
  .split(delimiter)
  .map((dir) => join(dir, '..', 'playwright', 'index.mjs'))
  .find((file) => existsSync(file));
if (!playwrightPath) {
  console.error('Playwright not found. Run: npm run ui-check');
  process.exit(2);
}
const { chromium } = await import(pathToFileURL(playwrightPath).href);

/** Runs in the page. Returns what is wrong with the screen as it stands, and its sizes. */
async function audit(minBoardShare) {
  const SLACK = 1.5;
  const app = document.querySelector('#app');
  const problems = new Set();
  const truncated = new Set();

  const label = (el) => {
    const cls =
      typeof el.className === 'string' && el.className.trim()
        ? `.${el.className.trim().split(/\s+/)[0]}`
        : '';
    const text = (el.textContent ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 24);
    const name = el.id ? `#${el.id}` : el.tagName.toLowerCase() + cls;
    return text ? `${name} "${text}"` : name;
  };
  const ownText = (el) =>
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const positioned = (el) =>
    ['absolute', 'fixed'].includes(getComputedStyle(el).position);

  /** The parts of `el` left after its scrolling and clipping ancestors, and who clipped it. */
  function visibleRects(el) {
    let rects = [...el.getClientRects()].map((r) => ({
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
    }));
    let clippedBy = null;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const box = p.getBoundingClientRect();
      for (const [overflow, lo, hi] of [
        [cs.overflowX, 'left', 'right'],
        [cs.overflowY, 'top', 'bottom'],
      ]) {
        if (overflow === 'visible') continue;
        for (const r of rects) {
          const lost = Math.max(box[lo] - r[lo], r[hi] - box[hi]);
          r[lo] = Math.max(r[lo], box[lo]);
          r[hi] = Math.min(r[hi], box[hi]);
          // Scrolled out of a scrolling box is fine: the player can scroll to it.
          if (lost > SLACK && !/auto|scroll/.test(overflow)) clippedBy ??= p;
        }
      }
    }
    rects = rects.filter((r) => r.right - r.left > 0 && r.bottom - r.top > 0);
    return { rects, clippedBy };
  }

  /** Bars and the event pill share the board screen; everything else is its own sheet. */
  function layer(el) {
    let p = el;
    while (p.parentElement && p.parentElement.id !== 'overlay-root') {
      p = p.parentElement;
    }
    return p.matches('#top, #bottom, .event-pill') ? 'chrome' : p;
  }

  const boxes = [];
  for (const el of app.querySelectorAll('*')) {
    if (!ownText(el) && !/^(IMG|BUTTON|INPUT|SELECT)$/.test(el.tagName))
      continue;
    if (
      !el.checkVisibility({ visibilityProperty: true, opacityProperty: true })
    ) {
      continue;
    }
    const { rects, clippedBy } = visibleRects(el);
    if (rects.length === 0) continue;
    if (clippedBy) problems.add(`clipped: ${label(el)} by ${label(clippedBy)}`);

    const cs = getComputedStyle(el);
    if (ownText(el) && cs.display !== 'inline') {
      const dx = el.scrollWidth - el.clientWidth;
      const dy = el.scrollHeight - el.clientHeight;
      if (dx > 1 && cs.textOverflow === 'ellipsis') {
        truncated.add(label(el));
      } else if (
        (dx > 1 && !/auto|scroll/.test(cs.overflowX)) ||
        (dy > 2 && !/auto|scroll/.test(cs.overflowY))
      ) {
        problems.add(`text overflows its box: ${label(el)} by ${dx}x${dy}`);
      }
    }
    boxes.push({ el, rects, layer: layer(el), positioned: positioned(el) });
  }

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.layer !== b.layer) continue;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      // The Bakery scene is a picture: its sprites are placed over one another.
      if (a.el.closest('.location-scene') && b.el.closest('.location-scene')) {
        continue;
      }
      // A badge may sit on its own button, but not on the neighbours.
      if (a.positioned && a.el.offsetParent?.contains(b.el)) continue;
      if (b.positioned && b.el.offsetParent?.contains(a.el)) continue;
      const hit = a.rects.some((r) =>
        b.rects.some(
          (s) =>
            Math.min(r.right, s.right) - Math.max(r.left, s.left) > 2 &&
            Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top) > 2,
        ),
      );
      if (hit) problems.add(`overlap: ${label(a.el)} and ${label(b.el)}`);
    }
  }

  // A Deliver button is pressed through its ::after, which is stretched over the card.
  const tapArea = (el) => {
    const after = getComputedStyle(el, '::after');
    return el.matches('.counter-card-deliver') && after.position === 'absolute'
      ? {
          width: Number.parseFloat(after.width),
          height: Number.parseFloat(after.height),
        }
      : el.getBoundingClientRect();
  };
  for (const el of app.querySelectorAll(
    '#tray button, .counter-card-deliver',
  )) {
    if (!el.checkVisibility()) continue;
    const r = tapArea(el);
    if (!(r.width >= 44 - SLACK && r.height >= 44 - SLACK)) {
      problems.add(
        `small tap target: ${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      );
    }
  }

  const stage = app.getBoundingClientRect();
  const insets = {
    top:
      document.querySelector('#top').getBoundingClientRect().bottom - stage.top,
    bottom:
      document.querySelector('#bottom').getBoundingClientRect().top - stage.top,
  };
  const { computeBoardLayout } = await import(
    new URL('src/ui/layout.ts', document.baseURI).href
  );
  const { cols, rows } = window.bakery.store.getState().board;
  const { cellSize } = computeBoardLayout(stage.width, cols, rows, insets);
  const boardShare = (insets.bottom - insets.top) / stage.height;
  if (boardShare < minBoardShare - 0.005) {
    problems.add(`board has ${Math.round(boardShare * 100)}% of the height`);
  }

  const scaleOf = (el) =>
    Number(getComputedStyle(el).getPropertyValue('--ui-scale'));
  const px = (selector, property) => {
    const el = document.querySelector(selector);
    return el ? Number.parseFloat(getComputedStyle(el)[property]) : null;
  };
  const ratio = (a, b) => Math.round((a / b) * 100) / 100;
  const icon = px('.tray-btn__icon', 'width');
  return {
    problems: [...problems],
    truncated: [...truncated],
    sizes: {
      uiScale: scaleOf(document.documentElement),
      barScale: scaleOf(document.querySelector('#top')),
      column: Math.round(stage.width),
      boardShare: Math.round(boardShare * 100) / 100,
      cell: Math.round(cellSize * 10) / 10,
      text: px('body', 'fontSize'),
      // T-R3: these two should hold steady from one viewport to the next.
      iconToText: ratio(icon, px('.tray-btn__label', 'fontSize')),
      iconToCell: ratio(icon, cellSize),
    },
  };
}

/** Runs in the page: a late-game save with the longest names and the biggest numbers. */
function loadLateGame() {
  const { store, load } = window.bakery;
  const d = store.data;
  const now = Date.now();
  const HOUR = 3_600_000;
  const longest = (xs) =>
    xs.reduce((a, b) => (b.name.length > a.name.length ? b : a));
  const item = longest(
    [...d.items.values()].filter((i) => !d.generators.has(i.id)),
  ).id;
  const customerId = longest([...d.customers.values()]).id;
  const event = [...d.events.values()][0];
  const recipes = [...d.recipes.keys()];
  const lastChapter = [...d.chapters.values()].at(-1);
  const order = (id, count, reward, extra) => ({
    id,
    customerId,
    wants: Array(count).fill(item),
    reward: { xp: 40, ...reward },
    ...extra,
  });
  const capacity = store.getState().pantry.capacity;

  load({
    chapterId: lastChapter.id,
    completedTasks: lastChapter.tasks.slice(0, -1).map((t) => t.id),
    tutorialStep: 'done',
    coins: 123456,
    stars: 9999,
    gems: 999,
    reputation: 999,
    level: 27,
    energy: { value: 3, updatedAt: now },
    discovered: [...d.items.keys()],
    pendingDiscoveries: [item],
    unlockedCustomers: [...d.customers.keys()],
    orders: [
      order(9001, 3, { coins: 1250, stars: 12 }),
      order(9002, 2, { coins: 900, stars: 8 }, { eventPoints: 120 }),
      order(
        9003,
        1,
        { coins: 4800, stars: 5 },
        { catering: { expiresAt: now + 23 * HOUR, upgradeChancePercent: 15 } },
      ),
      order(
        9004,
        10,
        { coins: 2400, stars: 0, reputation: 10 },
        { wholesale: { expiresAt: now + 47 * HOUR } },
      ),
      order(9005, 4, { coins: 300, stars: 3 }),
    ],
    nextOrderId: 9100,
    nextOrderAt: null,
    event: {
      eventId: event.id,
      startedAt: now,
      endsAt: now + event.durationSec * 1000,
      points: event.milestones[0].points,
      claimedMilestones: [],
    },
    nextEventAt: null,
    kitchen: {
      ovens: [...d.ovens.values()].map((oven, n) => ({
        ovenId: oven.id,
        // One bake ready, one under way, the rest empty.
        slots: Array.from({ length: oven.slots }, (_, slot) =>
          slot > 1
            ? null
            : {
                recipeId: recipes[(n + slot) % recipes.length],
                startedAt: now - HOUR,
                endsAt: slot === 0 ? now - 1000 : now + HOUR,
              },
        ),
      })),
    },
    pantry: {
      capacity,
      items: Array(capacity).fill({
        itemId: item,
        cobwebbed: false,
        generator: null,
      }),
    },
  });
}

const click = (page, selector, hasText) =>
  page
    .locator(selector, hasText ? { hasText } : {})
    .first()
    .evaluate((el) => el.click())
    .catch(() =>
      console.log(`  (nothing to click: ${selector} ${hasText ?? ''})`),
    );

/** Runs a `bakery` helper that reloads the page, and waits for the game to come back. */
async function reloadWith(page, fn, arg) {
  await Promise.all([page.waitForEvent('load'), page.evaluate(fn, arg)]);
  await ready(page);
}

async function ready(page) {
  await page.waitForSelector('.hud-container', { timeout: 120_000 });
  await page.waitForFunction(() => 'bakery' in window, null, {
    timeout: 120_000,
  });
  await page.waitForTimeout(800);
}

async function skipScenes(page) {
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(350);
    if (!(await page.locator('.dialogue:not([hidden])').count())) return;
    await click(page, '.dialogue__skip');
  }
}

async function run(browser, [width, height], textScale, results) {
  const name = `${width}x${height}@${textScale}`;
  const dir = join(OUT, name);
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`${name} page error: ${e.message}`));
  await page.addInitScript(
    (s) =>
      localStorage.setItem(
        'rise-and-shine-settings',
        JSON.stringify({ textScale: s }),
      ),
    textScale,
  );

  let n = 0;
  const check = async (screen) => {
    await page.waitForTimeout(400);
    n += 1;
    await page.screenshot({
      path: join(dir, `${n.toString().padStart(2, '0')}-${screen}.png`),
    });
    results.push({
      run: name,
      screen,
      ...(await page.evaluate(audit, MIN_BOARD_SHARE)),
    });
  };
  const tab = async (label) => click(page, '.nav-tab', label);
  const toggle = async (selector, screen) => {
    await click(page, selector);
    await check(screen);
    await click(page, selector);
  };

  // A new game.
  await page.goto(url, { timeout: 120_000 });
  await ready(page);
  await check('dialogue');
  await skipScenes(page);
  await check('tutorial');
  await click(page, '.tutorial__skip');
  await check('board');
  await toggle('.kitchen-toggle', 'oven');
  await toggle('.pantry-toggle', 'pantry');
  await click(page, '.help-toggle');
  await check('help');
  await click(page, '.help-dialog__close');
  for (const label of ['Recipes', 'Bakery', 'Shop', 'Settings']) {
    await tab(label);
    await check(label.toLowerCase());
  }

  // A late game: everything discovered, an event running, every kind of order.
  await reloadWith(page, loadLateGame);
  await check('discovery');
  await click(page, '.discovery__button');
  await skipScenes(page);
  await check('board-late');
  await click(page, '.event-pill');
  await check('event');
  await click(page, '.event-sheet__close');
  await toggle('.kitchen-toggle', 'oven-late');
  await toggle('.pantry-toggle', 'pantry-late');
  await page.evaluate(() => {
    const { store } = window.bakery;
    const cell = store
      .getState()
      .board.cells.findIndex((c) => c.kind === 'item' && !c.item.generator);
    store.dispatch({ type: 'sell', cell });
  });
  await check('sell-undo');
  await tab('Recipes');
  await check('recipes-late');
  await tab('Shop');
  await check('shop-late');
  await tab('Bakery');
  await check('location-late');
  await click(page, '.location-spot');
  await check('location-popover');
  await page.evaluate(() => {
    const { store } = window.bakery;
    for (const staffId of store.data.staff.keys()) {
      store.dispatch({ type: 'hireStaff', staffId });
    }
    document.querySelector('.staff-panel')?.scrollIntoView();
  });
  await check('staff');
  await tab('Board');

  await reloadWith(page, () => {
    const { store, load } = window.bakery;
    const { eventId } = store.getState().event;
    load({
      event: null,
      eventResult: { eventId, won: true, points: 420, coins: 300 },
    });
  });
  await check('event-result');
  await click(page, '.event-result__ok');
  await skipScenes(page);

  await reloadWith(page, () => window.bakery.away(600));
  await check('away');
  await click(page, '.away-card__ok');

  await page.evaluate(() => {
    const { store } = window.bakery;
    const taskId = [...store.data.chapters.values()].at(-1).tasks.at(-1).id;
    store.dispatch({ type: 'completeTask', taskId });
  });
  await check('finale');
  await skipScenes(page);
  await check('end');

  await context.close();
}

const browser = await chromium.launch({
  // The board is WebGL; this lets it draw without a GPU.
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});
const results = [];
// One viewport per worker; the three text sizes one after another.
await Promise.all(
  VIEWPORTS.map(async (viewport) => {
    for (const textScale of TEXT_SCALES) {
      if (!`${viewport.join('x')}@${textScale}`.includes(only)) continue;
      await run(browser, viewport, textScale, results);
    }
  }),
);
await browser.close();

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'report.json'), JSON.stringify(results, null, 2));

let failed = 0;
for (const r of results) {
  if (r.problems.length === 0) continue;
  failed += 1;
  console.log(`\n${r.run} ${r.screen}`);
  for (const p of r.problems) console.log(`  ${p}`);
}
console.log('\nSizes on the board screen (px):');
console.table(
  Object.fromEntries(
    results.filter((r) => r.screen === 'board').map((r) => [r.run, r.sizes]),
  ),
);
console.log(
  `${results.length - failed} of ${results.length} screens clean; screenshots and report.json in ${OUT}/`,
);
process.exit(failed ? 1 : 0);
