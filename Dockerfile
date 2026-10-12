# syntax=docker/dockerfile:1

# Build: Next.js static export into /app/out. Base images pinned by digest.
FROM node:24.12-alpine@sha256:c921b97d4b74f51744057454b306b418cf693865e73b8100559189605f6955b8 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Serve: unprivileged nginx (runs as UID 101, listens on 8080), nothing but static files.
FROM nginxinc/nginx-unprivileged:1.30-alpine@sha256:56b8272e43a0525f67aed68d1e0794a712d10e3e45a563e118e9a77c817e6f86
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 8080
