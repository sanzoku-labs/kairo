import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        performance: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        RequestInit: 'readonly',
      },
    },
    rules: {
      ...typescript.configs['recommended'].rules,
      ...typescript.configs['recommended-requiring-type-checking'].rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
    },
  },
  {
    files: ['tests/**/*.ts', 'examples/**/*.ts'],
    plugins: {
      '@typescript-eslint': typescript,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        performance: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        RequestInit: 'readonly',
        Storage: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      // Allow more flexibility in tests for mocking, but keep important safety rules
      '@typescript-eslint/no-explicit-any': 'warn', // Allow but warn
      '@typescript-eslint/no-unsafe-assignment': 'warn', // Allow but warn
      '@typescript-eslint/no-unsafe-member-access': 'warn', // Allow but warn
      // Keep these rules enabled for safety
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: ['**/*.config.{js,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
]
