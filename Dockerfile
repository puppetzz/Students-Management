# Use Node LTS
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for Next.js
RUN apk add --no-cache libc6-compat

# Copy package files only first (để tận dụng cache)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Expose port Next.js dev server
EXPOSE 3000

# Dev mode does NOT need non-root user
CMD ["npm", "run", "dev"]
