# syntax=docker/dockerfile:1

# ---- Build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ---- Runtime stage: static files served by nginx ---------------------------
FROM nginx:1.27-alpine AS runtime
# Default upstream address for the /api/ proxy, see nginx.conf.template - override these at
# `docker run`/compose time if api isn't reachable at this host:port (e.g. standalone deployments
# where api/client don't share a Docker network).
ENV API_HOST=api
ENV API_PORT=4000
COPY --from=build /app/dist /usr/share/nginx/html
# Goes into /etc/nginx/templates/ (not conf.d/ directly) so the base image's built-in
# entrypoint script (20-envsubst-on-templates.sh) resolves ${API_HOST}/${API_PORT} into
# /etc/nginx/conf.d/default.conf on container start.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
