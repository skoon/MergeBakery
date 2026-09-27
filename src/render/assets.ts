import { Assets, Texture } from 'pixi.js';

export const PLACEHOLDER_KEY = '_missing';

/**
 * Sprite keys with a file in public/art, by extension. A key with pixel art
 * (.png) uses it; everything else falls back to the generated .svg placeholder.
 */
const pngKeys = new Set(
  Object.keys(import.meta.glob('/public/art/*.png')).map((path) =>
    path.slice('/public/art/'.length, -'.png'.length),
  ),
);

/**
 * `${import.meta.env.BASE_URL}art/${spriteKey}.png` for keys that have pixel
 * art, `.svg` otherwise. Throws when the key has characters other than
 * a-z, A-Z, 0-9, "-" and "_".
 */
export function assetUrl(spriteKey: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(spriteKey)) {
    throw new Error(
      `Invalid sprite key "${spriteKey}": only a-z, A-Z, 0-9, "-" and "_" allowed`,
    );
  }
  const base = import.meta.env.BASE_URL || '/';
  const extension = pngKeys.has(spriteKey) ? 'png' : 'svg';
  return `${base}art/${spriteKey}.${extension}`;
}

/**
 * A per-key cache over any loader. get(key) loads assetUrl(key) once. If that
 * load fails, it calls warn once for that key and resolves to the placeholder's
 * value instead. If the placeholder itself fails to load, get rejects.
 */
export function createAssetCache<T>(
  load: (url: string) => Promise<T>,
  warn?: (message: string) => void,
): { get(spriteKey: string): Promise<T> } {
  const warnFn = warn || console.warn;
  const cache = new Map<string, Promise<T>>();
  const warned = new Set<string>();

  return {
    get(spriteKey: string): Promise<T> {
      const cached = cache.get(spriteKey);
      if (cached) return cached;

      const promise = (async () => {
        try {
          return await load(assetUrl(spriteKey));
        } catch {
          if (!warned.has(spriteKey)) {
            warned.add(spriteKey);
            warnFn(`Asset not found: ${spriteKey}`);
          }
          return load(assetUrl(PLACEHOLDER_KEY));
        }
      })();

      cache.set(spriteKey, promise);
      return promise;
    },
  };
}

/** A shared cache over PixiJS `Assets.load`. */
export function loadTexture(spriteKey: string): Promise<Texture> {
  return textureCache.get(spriteKey);
}

/** Sets img.src to the key's art; if the image fails to load, swaps to the placeholder once and warns. */
export function setImageArt(img: HTMLImageElement, spriteKey: string): void {
  // UI code rebuilds its images on every render, so a key that already failed goes straight to the placeholder.
  if (imageFailed.has(spriteKey)) {
    img.onerror = null;
    img.src = assetUrl(PLACEHOLDER_KEY);
    return;
  }

  img.onerror = () => {
    img.onerror = null; // a missing placeholder shows as broken instead of looping
    imageFailed.add(spriteKey);
    console.warn(`Asset not found: ${spriteKey}`);
    img.src = assetUrl(PLACEHOLDER_KEY);
  };
  img.src = assetUrl(spriteKey);
}

// Internal: shared cache for PixiJS textures. Pixel art needs nearest-neighbour
// scaling; PixiJS would otherwise blur it at board size.
const textureCache = createAssetCache(async (url: string) => {
  const texture = await Assets.load<Texture>(url);
  if (url.endsWith('.png')) {
    texture.source.scaleMode = 'nearest';
  }
  return texture;
});

// Internal: track which sprite keys we've already warned about for setImageArt
const imageFailed = new Set<string>();
