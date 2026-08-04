# Production image for noland-earthworks
# Extends node:22-slim with Chromium so the prerender middleware can serve
# fully-rendered HTML to Googlebot and other search engine crawlers.
#
# Skill ref: webdev-custom-dockerfile
# Base: node:22-slim (Debian 12 bookworm) — chromium package available in bookworm repos

FROM node:22-slim

# Install Chromium and required system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-noto-cjk \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium and skip its own download
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy all source files (patches/ must be present before pnpm install)
COPY . .

# Install all dependencies (including devDeps needed for vite/esbuild build)
RUN npm install -g corepack@latest && corepack pnpm install

# Build frontend (vite → dist/public) and server (esbuild → dist/index.js)
RUN corepack pnpm run build

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
