FROM node:22-alpine AS frontend-builder



WORKDIR /app

COPY ./Frontend/package*.json ./

RUN npm ci

COPY ./Frontend/ .

RUN npm run build



FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY ./Backend/package*.json ./

RUN npm ci 

## --omit=dev

COPY ./Backend/ .

COPY --from=frontend-builder /app/dist ./public

CMD ["node", "server.js"]