/**
 * Tests for the season display data (T14.8), with the autumn fixture pack.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setCell } from '../core/board';
import { stateWith, testData, type CellSpec } from '../core/testing';
import type {
  ActiveSeason,
  GameData,
  GameState,
  KeepsakeRecord,
} from '../core/types';
import fixture from '../seasons/fixtures/autumn.json';
import {
  parseSeasonPack,
  withSeasons,
  type SeasonTheme,
} from '../seasons/pack';
import {
  INVITES_KEY,
  createInviteMemory,
  invitationText,
  inviteKey,
  joinableSeason,
  seasonButton,
  seasonMusic,
  seasonResultView,
  seasonSheet,
  seasonTokens,
  type SeasonRecipeView,
  type SeasonThemes,
} from './seasonModel';
import type { KeyValueStorage } from './saveStorage';

const DAY = 86_400_000;
const START = Date.UTC(2026, 10, 12);
const END = Date.UTC(2026, 11, 1);
const NOW = START + DAY;

const pack = parseSeasonPack(testData, fixture);
const data = withSeasons(testData, [
  { pack, startsAt: START, endsAt: END, rules: null },
]);
const loaded = data.seasons.get('autumn');
if (!loaded) throw new Error('autumn not loaded');

const music = {
  bpm: 80,
  rootHz: 220,
  wave: 'triangle' as const,
  gain: 0.06,
  pattern: [0, 1, 2, 1, 0, 2, 1, 2],
  progression: [[0, 3, 7]],
};
const theme: SeasonTheme = {
  invitation: 'Gourds are in!',
  tokens: { '--color-crust': '#b5652b' },
  music,
  intro: null,
};
const themes: SeasonThemes = new Map([['autumn', theme]]);

function active(change: Partial<ActiveSeason> = {}): ActiveSeason {
  return {
    seasonId: 'autumn',
    joinedAt: START,
    startedAt: START,
    endsAt: END,
    points: 0,
    claimedMilestones: [],
    custom: null,
    ...change,
  };
}

function state(change: Partial<GameState> = {}): GameState {
  return stateWith({}, { tutorialStep: 'done', ...change });
}

describe('joinableSeason', () => {
  it('is the season whose window is open', () => {
    expect(joinableSeason(data, state(), NOW)).toBe(loaded);
  });

  it('is null before and after the window, during the tutorial, or once joined', () => {
    expect(joinableSeason(data, state(), START - 1)).toBeNull();
    expect(joinableSeason(data, state(), END)).toBeNull();
    expect(
      joinableSeason(data, state({ tutorialStep: 'firstMerge' }), NOW),
    ).toBeNull();
    expect(joinableSeason(data, state({ season: active() }), NOW)).toBeNull();
  });

  it('is null with no seasons loaded', () => {
    expect(joinableSeason(testData, state(), NOW)).toBeNull();
  });
});

describe('seasonButton', () => {
  it('offers an open season', () => {
    expect(seasonButton(data, state(), NOW)).toEqual({
      seasonId: 'autumn',
      name: 'Autumn Test',
      kind: 'offer',
      timeLeft: '18 d 0 h',
      claimable: 0,
      label: 'New season: Autumn Test',
    });
  });

  it('shows the joined season with its time left and rewards ready', () => {
    const button = seasonButton(
      data,
      state({ season: active({ points: 60, claimedMilestones: [0] }) }),
      END - 3 * 3_600_000,
    );
    expect(button).toMatchObject({
      kind: 'joined',
      timeLeft: '3 h 0 min',
      claimable: 1,
      label: 'Autumn Test, 3 h 0 min left, 1 reward ready',
    });
  });

  it('shows a joined season that is still waiting to start', () => {
    expect(
      seasonButton(data, state({ season: active({ startedAt: null }) }), NOW)
        ?.kind,
    ).toBe('joined');
  });

  it('is null with nothing to show, or a joined season whose pack is gone', () => {
    expect(seasonButton(data, state(), END)).toBeNull();
    expect(seasonButton(testData, state({ season: active() }), NOW)).toBeNull();
  });
});

describe('invitations', () => {
  it('keys a run by season and end, so next year invites again', () => {
    expect(inviteKey(loaded)).toBe(`autumn@${END.toString()}`);
  });

  it("uses the theme's text, or a default naming the season", () => {
    expect(invitationText(loaded.def, theme)).toBe('Gourds are in!');
    expect(invitationText(loaded.def, undefined)).toMatch(
      /^Autumn Test has come to town!/,
    );
  });

  describe('createInviteMemory', () => {
    let error: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function storage(initial: Record<string, string> = {}) {
      const items = new Map(Object.entries(initial));
      const store: KeyValueStorage = {
        getItem: (k) => items.get(k) ?? null,
        setItem: (k, v) => {
          items.set(k, v);
        },
      };
      return { store, items };
    }

    it('remembers what was seen across loads', () => {
      const { store, items } = storage();
      const first = createInviteMemory(store);
      expect(first.seen('autumn@1')).toBe(false);
      first.markSeen('autumn@1');
      first.markSeen('autumn@1');
      expect(first.seen('autumn@1')).toBe(true);
      expect(items.get(INVITES_KEY)).toBe('["autumn@1"]');
      expect(createInviteMemory(store).seen('autumn@1')).toBe(true);
    });

    it('logs a broken list and treats it as nothing seen', () => {
      const { store } = storage({ [INVITES_KEY]: '{"a":1}' });
      expect(createInviteMemory(store).seen('a')).toBe(false);
      expect(error).toHaveBeenCalledOnce();
    });

    it('logs storage that throws, and still works for this load', () => {
      const memory = createInviteMemory({
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {
          throw new Error('full');
        },
      });
      memory.markSeen('autumn@1');
      expect(memory.seen('autumn@1')).toBe(true);
      expect(error).toHaveBeenCalledTimes(2);
    });
  });
});

describe('seasonSheet', () => {
  it('invites with the track locked before joining', () => {
    const sheet = seasonSheet(data, state(), NOW, themes);
    expect(sheet).toMatchObject({
      status: 'offer',
      text: 'Gourds are in!',
      points: 0,
    });
    expect(sheet?.milestones.map((m) => m.status)).toEqual([
      'locked',
      'locked',
      'locked',
    ]);
  });

  it('names each reward, keepsakes included', () => {
    const sheet = seasonSheet(data, state(), NOW, themes);
    expect(sheet?.milestones.map((m) => m.rewardText)).toEqual([
      '50 coins',
      '100 coins, 5 gems',
      '10 gems, Harvest Wreath (keepsake)',
    ]);
  });

  it('says a joined season is waiting for room, MegaBun event or not', () => {
    const waiting = active({ startedAt: null });
    expect(
      seasonSheet(data, state({ season: waiting }), NOW, themes)?.text,
    ).toMatch(/room on the board or in the Pantry for the Gourd Patch/);
    const withEvent = state({
      season: waiting,
      event: {
        eventId: 'megabun',
        startedAt: NOW,
        endsAt: NOW + DAY,
        points: 0,
        claimedMilestones: [],
      },
    });
    expect(seasonSheet(data, withEvent, NOW, themes)).toMatchObject({
      status: 'waiting',
      text: "Autumn Test starts once there's room on the board or in the Pantry for the Gourd Patch.",
    });
  });

  it('shows points and which milestones are claimed, ready or locked', () => {
    const sheet = seasonSheet(
      data,
      state({ season: active({ points: 70, claimedMilestones: [0] }) }),
      NOW,
      themes,
    );
    expect(sheet?.status).toBe('running');
    expect(sheet?.points).toBe(70);
    expect(sheet?.milestones.map((m) => m.status)).toEqual([
      'claimed',
      'ready',
      'locked',
    ]);
  });

  it('is null when there is no button', () => {
    expect(seasonSheet(data, state(), END, themes)).toBeNull();
  });
});

describe('seasonResultView', () => {
  const wreath = (year: number): KeepsakeRecord => ({
    id: 'autumn-wreath',
    seasonId: 'autumn',
    name: 'Harvest Wreath',
    spriteKey: 'autumn-wreath',
    year,
  });

  it('is null without a result', () => {
    expect(seasonResultView(data, state())).toBeNull();
  });

  it('shows points, coins and the keepsakes of this run only', () => {
    const view = seasonResultView(
      data,
      state({
        seasonResult: { seasonId: 'autumn', points: 130, coins: 42 },
        keepsakes: [wreath(2025), wreath(2026)],
      }),
    );
    expect(view).toEqual({
      title: 'Autumn Test is over',
      lines: [
        'Season Points: 130',
        'Seasonal items sold for 42 coins',
        'Keepsakes for your shelf: Harvest Wreath',
      ],
    });
  });

  it('leaves out coins and keepsakes when there are none, and names a missing pack generically', () => {
    expect(
      seasonResultView(
        testData,
        state({ seasonResult: { seasonId: 'autumn', points: 5, coins: 0 } }),
      ),
    ).toEqual({ title: 'The season is over', lines: ['Season Points: 5'] });
  });
});

describe('theme', () => {
  it("applies the running season's tokens and music", () => {
    const running = state({ season: active() });
    expect(seasonTokens(data, running, themes)).toEqual({
      '--color-crust': '#b5652b',
    });
    expect(seasonMusic(data, running, themes)).toBe(music);
  });

  it('applies nothing before joining or while waiting to start', () => {
    for (const s of [state(), state({ season: active({ startedAt: null }) })]) {
      expect(seasonTokens(data, s, themes)).toEqual({});
      expect(seasonMusic(data, s, themes)).toBeNull();
    }
  });

  it('applies nothing for a season with no theme', () => {
    const running = state({ season: active() });
    expect(seasonTokens(data, running, new Map())).toEqual({});
    expect(seasonMusic(data, running, new Map())).toBeNull();
  });
});

describe('seasonSheet recipes (T14.11)', () => {
  /** The season running with the Gourd Patch at cell 10 and `cells` beside it. */
  function running(cells: Readonly<Record<number, CellSpec>>): GameState {
    const s = stateWith(cells, { tutorialStep: 'done', season: active() });
    return {
      ...s,
      board: setCell(s.board, 10, {
        kind: 'item',
        item: {
          itemId: 'autumn-patch-1',
          cobwebbed: false,
          generator: { charges: 20, cooldownEndsAt: null },
        },
      }),
    };
  }

  function recipe(s: GameState, d: GameData = data): SeasonRecipeView {
    const view = seasonSheet(d, s, NOW, themes)?.recipes[0];
    if (!view) throw new Error('no recipe in the sheet');
    return view;
  }

  it('lists the season’s recipes in every state', () => {
    const states = [
      state(),
      state({ season: active({ startedAt: null }) }),
      state({ season: active() }),
    ];
    for (const s of states) {
      expect(
        seasonSheet(data, s, NOW, themes)?.recipes.map((r) => r.recipeId),
      ).toEqual(['autumn-bake-pie']);
    }
  });

  it('shows it as the Kitchen does, needing nothing once every input can be had', () => {
    const view = recipe(running({ 0: 'flour-mill-1', 1: 'dairy-fridge-1' }));
    expect(view).toMatchObject({
      recipeId: 'autumn-bake-pie',
      name: 'Gourd pie',
      outputSpriteKey: 'autumn-pie',
      bakeTime: '2:00',
      needs: null,
    });
    expect(view.inputs).toEqual([
      {
        itemId: 'autumn-big-gourd',
        name: 'Big gourd',
        spriteKey: 'autumn-big-gourd',
        available: true,
      },
      {
        itemId: 'flour-bag',
        name: 'Flour bag',
        spriteKey: data.items.get('flour-bag')?.spriteKey,
        available: true,
      },
      {
        itemId: 'butter-pat',
        name: 'Butter pat',
        spriteKey: data.items.get('butter-pat')?.spriteKey,
        available: true,
      },
    ]);
  });

  it('names the generator of the one input missing', () => {
    const view = recipe(running({ 0: 'flour-mill-1' }));
    expect(view.needs).toBe('Needs a Dairy Fridge');
    expect(view.inputs.map((i) => i.available)).toEqual([true, true, false]);
  });

  it('names every generator missing, each once', () => {
    expect(recipe(running({})).needs).toBe(
      'Needs a Flour Mill and a Dairy Fridge',
    );
    // Running, with the patch gone from the board.
    expect(recipe(state({ season: active() })).needs).toBe(
      'Needs a Gourd Patch, a Flour Mill and a Dairy Fridge',
    );
  });

  it('leaves out what the season’s generator spawns until the season starts', () => {
    const waiting = { season: active({ startedAt: null }) };
    for (const change of [{}, waiting]) {
      const view = recipe(state(change));
      expect(view.needs).toBe('Needs a Flour Mill and a Dairy Fridge');
      expect(view.inputs.map((i) => i.available)).toEqual([true, false, false]);

      const owned = stateWith(
        { 0: 'flour-mill-1', 1: 'dairy-fridge-1' },
        { tutorialStep: 'done', ...change },
      );
      expect(recipe(owned).needs).toBeNull();
    }
  });

  it('counts a held input as available', () => {
    const view = recipe(running({ 0: 'flour-mill-1', 1: 'butter-pat' }));
    expect(view.needs).toBeNull();
    expect(view.inputs.every((i) => i.available)).toBe(true);
  });

  it('names the input itself when no generator spawns it', () => {
    const noFridges: GameData = {
      ...data,
      generators: new Map(
        [...data.generators].filter(([id]) => !id.startsWith('dairy-fridge')),
      ),
    };
    expect(recipe(running({ 0: 'flour-mill-1' }), noFridges).needs).toBe(
      'Needs a Butter pat',
    );
  });

  it('says "an" before a vowel', () => {
    const fridge = data.items.get('dairy-fridge-1');
    if (!fridge) throw new Error('no dairy-fridge-1');
    const iceBox: GameData = {
      ...data,
      items: new Map([
        ...data.items,
        ['dairy-fridge-1', { ...fridge, name: 'Ice Box' }],
      ]),
    };
    expect(recipe(running({ 0: 'flour-mill-1' }), iceBox).needs).toBe(
      'Needs an Ice Box',
    );
  });
});
