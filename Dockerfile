# --- Base Node image ---
FROM node:24-alpine AS base

# --- Build the application ---
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

COPY . .

# Use the appropriate install command based on the lockfile
RUN \
  if [ -f package-lock.json ]; then npm install; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --frozen-lockfile; \
  else echo "No lockfile found." && exit 1; \
  fi

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

# Next.js requires a non-root user
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -D nextjs

USER nextjs

EXPOSE 3000
CMD ["npm", "start"]
