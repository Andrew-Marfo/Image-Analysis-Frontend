# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build args for Vite env vars baked into the bundle at build time
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Replace default nginx config with our SPA config
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx:alpine's docker-entrypoint uses envsubst on *.conf.template files,
# so NGINX_BACKEND_URL is substituted at container start.
ENV NGINX_BACKEND_URL="http://backend:8000"

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
