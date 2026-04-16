FROM node:18-alpine

WORKDIR /usr/src/app

# Hanya install library yang dibutuhkan untuk jalan (production)
COPY package*.json ./
RUN npm install --production

COPY . .

# Pastikan server.js kamu pakai port 80!
EXPOSE 80

CMD ["node", "server.js"]
