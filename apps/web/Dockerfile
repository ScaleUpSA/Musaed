FROM node:24-bookworm AS assets

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY apps/web/package.json ./
RUN pnpm install --no-frozen-lockfile
COPY apps/web ./
RUN pnpm build

FROM composer:2 AS vendor
WORKDIR /app
COPY apps/web/composer.json apps/web/composer.lock ./
COPY apps/web/artisan ./artisan
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts

FROM php:8.5-cli-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y libpq-dev && docker-php-ext-install pdo_pgsql && rm -rf /var/lib/apt/lists/*
COPY apps/web ./
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build
COPY apps/web/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN rm -f bootstrap/cache/*.php && chmod +x /usr/local/bin/docker-entrypoint
EXPOSE 8000
ENTRYPOINT ["docker-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
