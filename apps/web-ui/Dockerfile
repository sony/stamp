
FROM --platform=linux/amd64 node:24-alpine as builder

WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY tsconfig.json next.config.js postcss.config.js tailwind.config.ts ./

RUN npm install -g npm@11.12.1 && npm ci

COPY custom-server custom-server
COPY src src

RUN npm run build
RUN npm run next-build

FROM --platform=linux/amd64 node:24-alpine as runner

WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/tsconfig.json /app/next.config.js ./
COPY --from=builder /app/custom-server.js ./custom-server.js

CMD ["node", "custom-server.js"]
