# syntax=docker/dockerfile:1.7

# Build en varias etapas sobre una base estándar de Node (ver design.md,
# decisión 3): sin compilar libvips/libheif a mano, sharp resuelve sus
# binarios precompilados para este mismo SO en cada etapa que instala
# dependencias.

FROM node:22-bookworm-slim AS base
WORKDIR /app

# --- Etapa de build: todas las dependencias, compila el sitio ---
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Etapa de dependencias de producción: sin devDependencies ---
FROM base AS prod-deps
COPY package.json package-lock.json ./
# --ignore-scripts: el hook "prepare" instala husky (devDependency, no está
# acá) para el pre-commit; sharp y libheif-js resuelven su binario nativo
# por optionalDependencies, no por script, así que no hace falta correrlos.
RUN npm ci --omit=dev --ignore-scripts

# --- Etapa final: sin herramientas de build, usuario no root ---
FROM base AS runtime
ENV NODE_ENV=production
ENV ASTRO_NODE_AUTOSTART=disabled
ENV HOST=0.0.0.0
ENV PORT=4321
ENV DATA_DIR=/data

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json server-entrypoint.mjs ./

# El punto de montaje de /data existe y es del usuario `node` desde la
# imagen, para que un volumen nombrado nuevo herede el dueño correcto.
RUN mkdir -p /data && chown -R node:node /data /app

USER node
EXPOSE 4321

CMD ["node", "server-entrypoint.mjs"]
