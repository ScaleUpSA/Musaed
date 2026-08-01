#!/bin/sh

set -eu

if [ -z "${APP_KEY:-}" ]; then
    echo "APP_KEY must be set before starting the web container." >&2
    echo "Copy .env.example to .env and set a persistent application key." >&2
    exit 1
fi

php artisan config:clear
php artisan migrate --force
php artisan db:seed --class=Database\\Seeders\\ModelCatalogueSeeder --force
php artisan config:cache

exec "$@"
