# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# deps: install node_modules once, shared by the dev and build stages
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# The `prepare` script installs Husky git hooks; there's no .git in the image.
COPY .husky/install.mjs .husky/install.mjs
RUN CI=true npm ci

# ---------------------------------------------------------------------------
# dev: Vite dev server (used by `docker compose up`)
# ---------------------------------------------------------------------------
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ---------------------------------------------------------------------------
# build: type-check and bundle into /app/dist
# ---------------------------------------------------------------------------
FROM deps AS build
# Vite inlines VITE_* values into the bundle at build time, so they must be
# supplied here (`--build-arg`), not at `docker run`. Unset args fall back to
# the defaults in src/config.ts. .env is excluded by .dockerignore.
ARG VITE_SERVER_API_BASE_URL
ARG VITE_DEFAULT_THEME
ARG VITE_ALLOW_SELF_REGISTER
ARG VITE_PROJECT
ARG VITE_LOGO
ARG VITE_VERSION
ARG VITE_LAYOUT
ARG VITE_DRAWER_BREAKPOINT
ARG VITE_DRAWER_COLLAPSIBLE
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# prod: static files served by nginx
# ---------------------------------------------------------------------------
FROM nginx:1.29-alpine AS prod
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 nginx/15-api-proxy.sh /docker-entrypoint.d/15-api-proxy.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
