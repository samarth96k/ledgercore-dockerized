FROM grafana/k6:latest AS k6

FROM node:22-alpine

COPY --from=k6 /usr/bin/k6 /usr/local/bin/k6

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "server"]