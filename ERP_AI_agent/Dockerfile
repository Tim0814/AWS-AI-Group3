# ── Stage 1: build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: production server ────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY server/ ./server/
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "server/index.js"]

# ── Stage 3: development server with hot reload ───────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001 5173
CMD ["sh", "-c", "npm run dev & node server/index.js"]
