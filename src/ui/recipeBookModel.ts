/**
 * What the Recipe Book shows (T5.6). Pure, no DOM.
 */

import type { ChainId, GameData, GameState, ItemId } from '../core/types';

export interface BookItem {
  itemId: ItemId;
  tier: number;
  spriteKey: string;
  discovered: boolean;
  /** null while undiscovered, so the page doesn't give the name away. */
  name: string | null;
  /** Grandma's note once discovered; null while undiscovered or when she hasn't written one. */
  note: string | null;
}

export interface BookPage {
  chainId: ChainId;
  name: string;
  color: string;
  /** By tier. */
  items: BookItem[];
  discoveredCount: number;
  completionGems: number;
  rewarded: boolean;
}

/** One page per ingredient chain, then per baked chain, each in data order. */
export function recipeBookPages(data: GameData, state: GameState): BookPage[] {
  const discovered = new Set(state.discovered);
  const chains = Array.from(data.chains.values());
  const ordered = [
    ...chains.filter((c) => c.kind === 'ingredient'),
    ...chains.filter((c) => c.kind === 'baked'),
  ];

  return ordered.map((chain) => {
    const items: BookItem[] = (data.chainItems.get(chain.id) ?? []).map(
      (item) => {
        const known = discovered.has(item.id);
        return {
          itemId: item.id,
          tier: item.tier,
          spriteKey: item.spriteKey,
          discovered: known,
          name: known ? item.name : null,
          note: known ? item.note : null,
        };
      },
    );
    return {
      chainId: chain.id,
      name: chain.name,
      color: chain.color,
      items,
      discoveredCount: items.filter((i) => i.discovered).length,
      completionGems: chain.completionGems,
      rewarded: state.rewardedChains.includes(chain.id),
    };
  });
}
