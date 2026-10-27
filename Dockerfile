# --- Stage 1: Build React Client ---
FROM node:22-bookworm-slim AS client-builder
WORKDIR /build/client

COPY client/package*.json ./
RUN npm ci || npm install

COPY client/ ./
RUN npm run build

# --- Stage 2: Production Server & Runtime ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install system Chromium, fonts, and dumb-init for Puppeteer / whatsapp-web.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    dumb-init \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PORT=5000

# Install production server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server application files
COPY server/ /app/server/

# Copy built frontend assets from builder stage
COPY --from=client-builder /build/client/dist /app/client/dist

# Ensure persistence directories exist
RUN mkdir -p /app/server/data /app/server/.wwebjs_auth /app/server/.wwebjs_cache

EXPOSE 5000

# dumb-init handles PID 1 signal forwarding and reaps zombie Chromium processes
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
