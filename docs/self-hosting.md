# Self-hosting with Docker

The CRM runs on any Linux server with Docker. One image holds the whole
monorepo. `docker-compose.prod.yml` runs it as separate services:

| Service | Port | What it does |
| --- | --- | --- |
| `postgres` | internal | Postgres 17. Data lives in the `postgres-data` volume. |
| `migrate` | — | Runs `prisma migrate deploy` once, then exits. |
| `api` | `3001` | NestJS + tRPC + Better Auth. Serves `/api/auth/*`, `/health`, Swagger at `/`. |
| `app` | `3000` | The Next.js web app. |
| `agent` | `2000` | The research agent. Optional, behind the `agent` profile. |

The start order is enforced: postgres healthy → migrate succeeds → api healthy → app.

## First run

```sh
cp .env.example .env
```

Set these in `.env`:

```sh
POSTGRES_PASSWORD="$(openssl rand -hex 24)"
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
CRON_SECRET="$(openssl rand -hex 24)"
ALLOWED_SIGN_IN="yourcompany.com"
API_URL="https://api.crm.yourcompany.com"
APP_URL="https://crm.yourcompany.com"
AUTH_COOKIE_DOMAIN=".crm.yourcompany.com"
```

Then:

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

Open `APP_URL`, choose **Create an account**, and sign up with an address that
`ALLOWED_SIGN_IN` admits. The first account creates the workspace.

## Sign-in

Email + password is the standard sign-in. It needs no outside service.

- `ALLOWED_SIGN_IN` decides who may create an account. An empty list lets nobody in.
- Passwords have a minimum of 8 characters.
- Sign-up signs the user in immediately. Email addresses are not verified.
- Google, Microsoft and SSO are optional extras. See `.env.example`.

## URLs and cookies

`API_URL` is compiled into the web app's browser bundle at build time. **Rebuild
the image when `API_URL` changes.**

The session cookie is set by the API and read by the app, so both must share it:

- **Localhost demo:** use the defaults. Cookies ignore the port, so
  `localhost:3000` and `localhost:3001` share them.
- **Production:** put the app and the API on sibling subdomains, for example
  `crm.example.com` and `api.crm.example.com`. Set `AUTH_COOKIE_DOMAIN` to their
  common parent, `.crm.example.com`.
- **HTTPS is required in production.** The containers run with
  `NODE_ENV=production`, so cookies are `Secure`. A browser drops `Secure`
  cookies on plain `http://` for any host except `localhost`.

Terminate TLS in a reverse proxy in front of ports 3000 and 3001. A Caddyfile
example:

```
crm.example.com {
	reverse_proxy localhost:3000
}

api.crm.example.com {
	reverse_proxy localhost:3001
}
```

## Scheduled jobs

Vercel ran these on a cron. On your own server, call them with `CRON_SECRET`
from the host's crontab or any scheduler:

```sh
*/5 * * * *  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.crm.example.com/internal/sync/mailboxes
0 6 * * *    curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.crm.example.com/internal/sync/rates
0 7 * * *    curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.crm.example.com/internal/telemetry/rollup
0 4 * * *    curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.crm.example.com/internal/tracking/retention
0 5 * * *    curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.crm.example.com/internal/archive/prune
```

Mailbox sync does nothing until Google or Microsoft is configured.

## The research agent

```sh
docker compose -f docker-compose.prod.yml --profile agent up -d
```

The agent needs a model. Off Vercel, set `AI_GATEWAY_API_KEY`. Set the same
`AGENT_BRIDGE_SECRET` for every service, and set `AGENT_URL="http://agent:2000"`.
The other agent keys are optional. See the agent section of `.env.example`.

## Operations

```sh
docker compose -f docker-compose.prod.yml logs -f api app
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U crm crm > backup.sql
```

A new release runs its migrations in the `migrate` service on the next `up`.
