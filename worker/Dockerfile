FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# Production stage
FROM node:20-slim

WORKDIR /app

# Install Claude Code CLI (required by Agent SDK)
RUN npm install -g @anthropic-ai/claude-code

# Copy built output and production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ ./dist/

# Create workspace directory
RUN mkdir -p /tmp/workspaces

EXPOSE 8080

CMD ["node", "dist/index.js"]
