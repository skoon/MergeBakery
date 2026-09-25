import { describe, expect, it } from 'vitest';
import tokensCss from './tokens.css?raw';

function readCustomProperties(css: string): Map<string, string> {
  const properties = new Map<string, string>();
  for (const match of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name === undefined || value === undefined) {
      throw new Error(`Unparseable custom property: ${match[0]}`);
    }
    properties.set(name, value.trim());
  }
  return properties;
}

const tokens = readCustomProperties(tokensCss);

function token(name: string): string {
  const value = tokens.get(name);
  if (value === undefined) {
    throw new Error(`tokens.css is missing --${name}`);
  }
  return value;
}

describe('tokens.css', () => {
  it.each(['butter', 'crust', 'strawberry', 'mint', 'cream', 'ink'])(
    'defines --color-%s as a hex color',
    (name) => {
      expect(token(`color-${name}`)).toMatch(/^#[0-9a-f]{6}$/i);
    },
  );

  it('defines a spacing scale that grows at every step', () => {
    const steps = [1, 2, 3, 4, 5, 6, 7, 8].map((step) =>
      Number.parseFloat(token(`space-${step}`)),
    );
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1] ?? Infinity);
    }
  });

  it('ends the font stack with a generic family', () => {
    expect(token('font-body')).toMatch(/sans-serif$/);
  });

  it('defaults --text-scale to 1', () => {
    expect(token('text-scale')).toBe('1');
  });

  it.each(['sm', 'md', 'lg', 'xl'])(
    'scales --font-size-%s by --text-scale',
    (size) => {
      expect(token(`font-size-${size}`)).toContain('var(--text-scale)');
    },
  );
});
