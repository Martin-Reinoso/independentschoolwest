FROM node:24.21.0-bookworm-slim
ENV NODE_ENV=production BILLING_HOST=127.0.0.1 BILLING_PORT=4318
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY src ./src
COPY public ./public
COPY assets ./assets
COPY scripts ./scripts
USER node
EXPOSE 4318
CMD ["node", "src/server.mjs"]
