import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Vitest replaces CSS with empty strings unless included; tokens.test.ts reads tokens.css.
    css: { include: [/tokens\.css/] },
  },
});
