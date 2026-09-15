// @ts-check
import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';

export default defineConfig(
  {
    ignores: ['dist/**', '.astro/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...eslintPluginAstro.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': ['error', { allow: ['error'] }],
    },
  },
  {
    files: ['**/*.astro'],
    rules: {
      // El dominio no vive en archivos .astro; el tipado de props ya lo cubre astro-eslint-parser.
      '@typescript-eslint/no-unused-vars': 'off',
      // `astro-eslint-parser` no expone información de tipos confiable dentro de
      // las expresiones del template (p. ej. el retorno de un `.map()` que arma
      // markup), así que las reglas type-aware de "no-unsafe-*" producen falsos
      // positivos ahí. El resto del archivo (el frontmatter) sigue cubierto por
      // `strictTypeChecked`/`stylisticTypeChecked`.
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
