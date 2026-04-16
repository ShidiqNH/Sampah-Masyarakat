# --- Stage 1: Build Stage ---
FROM node:18-alpine AS builder

WORKDIR /app

# Salin package.json dan lock file untuk install dependencies
COPY package*.json ./
RUN npm install

# Salin seluruh folder dan file proyek
COPY . .

# --- Stage 2: Production Stage ---
FROM node:18-alpine

WORKDIR /app

# Salin node_modules dan file aplikasi dari stage sebelumnya
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Expose port 3000 (sesuai port aplikasi Anda)
EXPOSE 3000

# Jalankan aplikasi
CMD ["node", "server.js"]