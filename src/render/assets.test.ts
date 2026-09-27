import { describe, it, expect, vi } from 'vitest';
import { assetUrl, PLACEHOLDER_KEY, createAssetCache } from './assets';

describe('assetUrl', () => {
  it('returns the correct URL format', () => {
    const url = assetUrl('test-sprite');
    expect(url).toBe('/art/test-sprite.svg');
  });

  it('works with alphanumeric, dash, and underscore characters', () => {
    const url = assetUrl('my_sprite-name123');
    expect(url).toBe('/art/my_sprite-name123.svg');
  });

  it('uses .png for keys that have pixel art in public/art', () => {
    expect(assetUrl('cookie')).toBe('/art/cookie.png');
    expect(assetUrl('dairy-fridge-1')).toBe('/art/dairy-fridge-1.png');
  });

  it('throws on invalid characters', () => {
    expect(() => assetUrl('sprite@invalid')).toThrow();
    expect(() => assetUrl('sprite.invalid')).toThrow();
    expect(() => assetUrl('sprite invalid')).toThrow();
    expect(() => assetUrl('sprite/path')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => assetUrl('')).toThrow();
  });
});

describe('createAssetCache', () => {
  it('loads a key once even when requested multiple times', async () => {
    const loader = vi.fn(async () => Promise.resolve('texture'));
    const cache = createAssetCache(loader);

    const result1 = await cache.get('sprite1');
    const result2 = await cache.get('sprite1');

    expect(result1).toBe('texture');
    expect(result2).toBe('texture');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledWith('/art/sprite1.svg');
  });

  it('loads different keys separately', async () => {
    const loader = vi.fn((url: string) => Promise.resolve(`texture-${url}`));
    const cache = createAssetCache(loader);

    await cache.get('sprite1');
    await cache.get('sprite2');

    expect(loader).toHaveBeenCalledTimes(2);
    expect(loader).toHaveBeenNthCalledWith(1, '/art/sprite1.svg');
    expect(loader).toHaveBeenNthCalledWith(2, '/art/sprite2.svg');
  });

  it('falls back to placeholder when a key fails to load', async () => {
    const loader = vi.fn((url: string) => {
      if (url.includes('missing')) {
        return Promise.resolve('placeholder-texture');
      }
      return Promise.reject(new Error('Not found'));
    });

    const cache = createAssetCache(loader);
    const result = await cache.get('sprite1');

    expect(result).toBe('placeholder-texture');
    // Called once for sprite1, once for _missing
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('warns exactly once when a key fails', async () => {
    const loader = vi.fn((url: string) => {
      if (url.includes(PLACEHOLDER_KEY)) {
        return Promise.resolve('placeholder');
      }
      return Promise.reject(new Error('Not found'));
    });

    const warn = vi.fn();
    const cache = createAssetCache(loader, warn);

    await cache.get('sprite1');
    await cache.get('sprite1');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Asset not found: sprite1');
  });

  it('uses console.warn by default', async () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const loader = vi.fn((url: string) => {
      if (url.includes(PLACEHOLDER_KEY)) {
        return Promise.resolve('placeholder');
      }
      return Promise.reject(new Error('Not found'));
    });

    const cache = createAssetCache(loader);
    await cache.get('sprite1');

    expect(consoleWarnSpy).toHaveBeenCalledWith('Asset not found: sprite1');
    consoleWarnSpy.mockRestore();
  });

  it('rejects if the placeholder itself fails to load', async () => {
    const loader = vi.fn(() => Promise.reject(new Error('Load failed')));

    const cache = createAssetCache(loader);

    await expect(cache.get('sprite1')).rejects.toThrow('Load failed');
  });

  it('preserves the warn function across multiple loads', async () => {
    const loader = vi.fn((url: string) => {
      if (url.includes(PLACEHOLDER_KEY)) {
        return Promise.resolve('placeholder');
      }
      return Promise.reject(new Error('Not found'));
    });

    const warn = vi.fn();
    const cache = createAssetCache(loader, warn);

    await cache.get('sprite1');
    await cache.get('sprite2');

    // Each should warn once
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenNthCalledWith(1, 'Asset not found: sprite1');
    expect(warn).toHaveBeenNthCalledWith(2, 'Asset not found: sprite2');
  });
});
