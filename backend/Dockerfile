FROM node:22-bookworm

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY db/ /app/db/

ENV NODE_ENV=development
EXPOSE 3000

CMD ["node", "server.js"]
