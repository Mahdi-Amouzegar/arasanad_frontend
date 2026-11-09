// ═══════════════════════════════════════════════════════════════════════════
// eslint.config.mjs — تنظیمات ESLint (flat config)
// ═══════════════════════════════════════════════════════════════════════════

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      '_legacy/**',
      'backup/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // ⚠️ قاعده‌ی پروژه: هشدار بومی مرورگر ممنوع است.
      //    همه‌ی هشدارها باید از سیستم یکپارچه‌ی Alert بیایند.
      'no-alert': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
    },
  },
];

export default config;
