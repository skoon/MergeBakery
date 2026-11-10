import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // public/seasons is the season build's output (T14.7).
  { ignores: ['dist', 'coverage', 'public/seasons'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    // A season's rules ship as their own module, so they may use the game's
    // types but no game code (T14.7); files in the pack's folder are fine.
    files: ['seasons/*/rules.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\./)',
              allowTypeImports: true,
              message:
                'rules.ts may only `import type` from the game; at runtime it can import only files in its own folder.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
