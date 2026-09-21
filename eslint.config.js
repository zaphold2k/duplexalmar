// @ts-check
import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';

export default defineConfig(
  {
    // .ci-workflows/: checkout del componente reutilizable que el CI hace
    // dentro del propio working directory (ver ci-workflows/docs/INPUTS.md);
    // trae sus propios fixtures de lint deliberadamente rotos para probar
    // el conteo de supresiones, así que no es código de este repo.
    ignores: ['dist/**', '.astro/**', 'node_modules/**', '.ci-workflows/**'],
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
      // Bug conocido de esta combinación de versiones: `no-misused-promises`
      // revienta (no reporta, tira excepción) al revisar un `return` dentro
      // de un `if` en el frontmatter, porque astro-eslint-parser sintetiza
      // una función sin el nodo padre que la regla espera ahí.
      '@typescript-eslint/no-misused-promises': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['scripts/**'],
    rules: {
      // Son utilitarios de línea de comandos: su salida es la consola.
      'no-console': 'off',
    },
  },
  {
    // Corre en la imagen final de Docker, sin paso de build (ver Dockerfile):
    // tiene que ser JS plano, así que TypeScript no lo type-checkea ni le da
    // globales de Node vía tsconfig. Además importa `./dist/server/entry.mjs`,
    // que sólo existe después de `npm run build`; en un clon recién hecho
    // (antes del primer build) ese import no resuelve, así que las reglas
    // type-aware ven todo como `any`/error y no aportan nada real acá.
    files: ['server-entrypoint.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
