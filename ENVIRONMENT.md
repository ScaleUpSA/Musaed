# Environment blueprint

Commands used on the Ubuntu host:

```sh
sudo apt-get update
sudo apt-get install -y podman php8.5-pgsql git unzip ca-certificates curl jq \
  build-essential uidmap slirp4netns fuse-overlayfs
sudo apt-get install -y composer
source /home/ubuntu/.nvm/nvm.sh
nvm install 24
nvm alias default 24
nvm use 24
corepack enable
corepack prepare pnpm@10.13.1 --activate
```

Installed versions:

```text
PHP 8.5.9
Composer 2.2.6 (Ubuntu package)
Node v24.18.1
pnpm 10.13.1
Podman 3.4.4
```

Composer 2.2.6 emits deprecation notices under PHP 8.5, but Laravel
installation and tests succeed. Upgrade Composer through the official
installer when the host image provides a writable temporary download path.

The broker is intentionally an in-memory stub in this scaffold. Compose does
not mount Docker or Podman sockets into any service, and the broker does not
launch containers yet.

## Laravel version note

The web application uses Laravel 12 rather than Laravel 13 because the
official `laravel/react-starter-kit` version used by this scaffold requires
`laravel/framework ^12.0`. Revisit the upgrade when the starter kit supports
Laravel 13.

## Clean checkout verification

From a fresh clone, run:

```sh
cp .env.example .env
docker compose --env-file .env -f docker/compose.yml up -d --build
curl --fail http://localhost:8000/register
```

The web entrypoint runs `php artisan migrate --force` and
`php artisan config:cache` on every start. It refuses to start when `APP_KEY`
is unset; never generate a new production key during container startup.

PostgreSQL creates a separate `litellm` database during first initialization.
LiteLLM uses that database exclusively; do not point it at the Laravel
application database or remove the `docker/postgres-init` mount.
