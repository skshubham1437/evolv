# ── Build stage ──────────────────────────────────────────
FROM node:20-alpine AS builder

# VITE_API_URL is baked into the bundle at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

# Cache dependency layer
COPY package*.json ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# ── Serve stage ───────────────────────────────────────────
FROM nginx:alpine AS runner

# Copy the compiled SPA
COPY --from=builder /app/dist /usr/share/nginx/html

# Use a custom Nginx config that handles client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
