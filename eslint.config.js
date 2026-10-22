import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import testingLibrary from 'eslint-plugin-testing-library';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.ai/specs/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  jsxA11y.flatConfigs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: './tsconfig.app.json',
        },
      },
    },
    rules: {
      'no-undef': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'This is an offline game. No runtime network calls are allowed (ADR-001).',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='canvas']",
          message: 'DOM-only rendering. Canvas is forbidden (ADR-002).',
        },
      ],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        { allowString: false, allowNumber: false, allowNullableObject: false },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'off',
      'import-x/newline-after-import': 'error',
      'import-x/no-cycle': ['error', { maxDepth: Infinity, ignoreExternal: true }],
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/game',
              from: './src/app',
              message: 'The game domain cannot import the app layer.',
            },
            {
              target: './src/game',
              from: './src/features',
              message: 'The game domain cannot import UI features.',
            },
            {
              target: './src/game',
              from: './src/shared',
              message: 'Keep the game domain pure; shared browser/UI helpers belong outside it.',
            },
            {
              target: './src/shared',
              from: './src/app',
              message: 'Shared primitives cannot import the app layer.',
            },
            {
              target: './src/shared',
              from: './src/features',
              message: 'Shared primitives cannot import features.',
            },
            {
              target: './src/shared',
              from: './src/game',
              message: 'Shared primitives cannot import the game domain.',
            },
            {
              target: './src/features',
              from: './src/app',
              message: 'Features cannot import the app composition root.',
            },
          ],
        },
      ],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import-x/no-default-export': 'error',
    },
  },
  {
    files: ['src/game/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'The game domain must stay framework-agnostic (ADR-003).',
            },
            {
              name: 'react-dom',
              message: 'The game domain must stay framework-agnostic (ADR-003).',
            },
            {
              name: 'react-router',
              message: 'The game domain must stay framework-agnostic (ADR-003).',
            },
          ],
          patterns: [
            {
              group: ['@/app/*', '@/features/*', '@/shared/*'],
              message: 'The game domain cannot import app, features, or shared modules (ADR-003).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'The game domain must not touch the DOM (ADR-003).' },
        { name: 'document', message: 'The game domain must not touch the DOM (ADR-003).' },
        { name: 'localStorage', message: 'Persistence belongs to the app layer (ADR-003).' },
        { name: 'sessionStorage', message: 'Persistence belongs to the app layer (ADR-003).' },
        { name: 'setTimeout', message: 'Inject time into the domain instead of scheduling it.' },
        { name: 'setInterval', message: 'Inject time into the domain instead of scheduling it.' },
        { name: 'requestAnimationFrame', message: 'Animation belongs to the UI layer.' },
        { name: 'fetch', message: 'This is an offline game. No runtime network calls (ADR-001).' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use the seeded RNG in src/game/rng.ts.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Pass timestamps into the domain; do not read the clock.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    plugins: {
      ...testingLibrary.configs['flat/react'].plugins,
      ...vitest.configs.recommended.plugins,
    },
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
      ...vitest.configs.recommended.rules,
      'no-console': 'off',
      'import-x/no-default-export': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      'no-console': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'import-x/no-default-export': 'off',
    },
  },
  {
    files: ['src/test/setup.ts'],
    rules: {
      'testing-library/no-manual-cleanup': 'off',
    },
  },
  {
    files: ['*.{js,mjs}', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off',
      'import-x/no-default-export': 'off',
      'import-x/no-extraneous-dependencies': 'off',
    },
  },
  prettier,
);
