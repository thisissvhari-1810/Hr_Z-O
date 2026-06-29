# ----------------------------------------------------------------------
# PeopleFlow backend image — Node 20 + Express + pg.
# ----------------------------------------------------------------------
FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app

# Install deps first to leverage Docker layer caching.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev; \
    fi

# Copy app source.
COPY src ./src

# Run as a non-root user (the image ships with one).
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=4s --start-period=20s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:4000/api/health > /dev/null || exit 1

CMD ["node", "src/server.js"]
