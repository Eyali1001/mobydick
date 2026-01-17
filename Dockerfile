FROM node:20-slim

# Install OpenSSL and other dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Run database push and start server
CMD npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss && npm run start
