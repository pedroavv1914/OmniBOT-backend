FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]