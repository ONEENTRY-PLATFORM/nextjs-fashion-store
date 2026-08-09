// Flat config, ESLint 9. See https://eslint.org/docs/latest/use/configure/configuration-files
import prettierConfig from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import storybook from 'eslint-plugin-storybook';
import tailwindcss from 'eslint-plugin-tailwindcss';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');
const nextTypescript = require('eslint-config-next/typescript');

const base = Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals];
const ts = Array.isArray(nextTypescript) ? nextTypescript : [nextTypescript];

const config = [
  // ── Ignored paths ──
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'public/**', 'storybook-static/**', 'coverage/**'],
  },

  // ── Next.js base + TypeScript rules (carries react, react-hooks, jsx-a11y, import) ──
  ...base,
  ...ts,

  // ── Import hygiene + deterministic import order ──
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    plugins: {
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      // `import/order` would fight simple-import-sort — only one of them may own ordering.
      'import/order': 'off',
      'import/no-duplicates': 'warn',
      'import/newline-after-import': 'warn',
      'import/no-self-import': 'error',
      // Safe now that `@/*` means `src/*` everywhere (root tsconfig, tests/tsconfig,
      // vitest.config). While those disagreed, this rule's autofix produced paths that
      // type-checked and then died at test collection with "Failed to resolve import".
      'import/no-useless-path-segments': 'warn',
    },
  },

  // ── Tailwind v4: class order and typos, resolved from the real CSS entrypoint ──
  {
    ...tailwindcss.configs.recommended,
    settings: {
      tailwindcss: {
        cssConfigPath: './app/globals.css',
      },
    },
    rules: {
      ...tailwindcss.configs.recommended.rules,
      // Prettier's tailwind plugin already sorts classes on format; keep the lint signal off.
      'tailwindcss/classnames-order': 'off',
      'tailwindcss/no-custom-classname': 'off',
    },
  },

  // ── JSDoc: shape-checking only, TypeScript already carries the types ──
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: { jsdoc },
    rules: {
      ...jsdoc.configs['flat/recommended-typescript'].rules,
      // Presence rules stay off: the signature already states params and return type,
      // so demanding a tag per param only buys empty `@param foo` lines.
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      // Correctness rules stay on: a tag that IS written must name a real param,
      // must be a real tag, and must not restate the TypeScript type.
      'jsdoc/tag-lines': ['warn', 'any', { startLines: 1 }],
    },
  },

  // ── Project-specific overrides ──
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // `disallowTypeAnnotations: false` — vitest mocks legitimately need `typeof import('…')`.
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
      ],

      // React
      'react/self-closing-comp': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',

      // Next.js
      '@next/next/no-img-element': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // ── Tests: fixtures are hand-built, so `!` and `any` are the point ──
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      'tests/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  // ── Storybook ──
  ...storybook.configs['flat/recommended'],
  {
    files: ['**/*.stories.{ts,tsx}', '.storybook/**/*.{ts,tsx,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'jsdoc/require-param': 'off',
    },
  },

  // ── Prettier last: turns off every stylistic rule that would fight `npm run format`.
  //    Formatting itself is not linted — it runs as `prettier --write`, which is far faster
  //    than reporting each diff hunk as a lint warning. ──
  prettierConfig,
];

export default config;
