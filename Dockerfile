FROM node:22-slim AS build

RUN npm install -g pnpm
RUN pnpm config set ignore-scripts false
ENV PNPM_ENABLE_BUILD_DEPENDENCIES=1
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --unsafe-perm --config.only-built-dependencies=false
COPY . .
RUN pnpm build

FROM node:22-slim AS rt

WORKDIR /app

COPY --from=build /app .

COPY docker-entrypoint.sh docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

CMD ["./docker-entrypoint.sh"]
