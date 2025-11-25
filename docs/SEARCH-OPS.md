# Search App Ops (Local NGINX on 9000)

This document explains how to build, run, test, and stop the Search stack using a self-contained NGINX on port `9000`.

## Build

- Backend (NestJS):
  - `npm run build`
- Frontend (Vite SPA):
  - `npm run web:build`

Artifacts:
- API entrypoint: `dist/search-api/src/main.js`
- Web root: `apps/search-web/dist/`

## Run

- Start API (port 3100):
  - `npm run start:api`
- Start NGINX (port 9000) with project config:
  - `npm run start:nginx`

NGINX config is in `nginx/search.conf`, serving the SPA and proxying `/search|/analytics|/health` to `http://127.0.0.1:3100`.

## Smoke tests

- Static HTML:
  - `curl http://127.0.0.1:9000/ | head`
- Health:
  - `curl http://127.0.0.1:9000/health`
- Food search (Veg):
  - `curl 'http://127.0.0.1:9000/search/food?q=pizza&veg=1' | jq '.meta.total'`
- Food search (Non-Veg):
  - `curl 'http://127.0.0.1:9000/search/food?q=noodles&veg=0' | jq '.meta.total'`
- E-commerce search (Veg facet present but data may lack `veg` field):
  - `curl 'http://127.0.0.1:9000/search/ecom?q=milk&veg=1' | jq '.meta.total'`

## Stop

- Stop local NGINX:
  - `npm run stop:nginx`
  - or `nginx -p $(pwd)/nginx -c $(pwd)/nginx/search.conf -s stop`
- Stop API: find its PID (listening on 3100) and kill, or close the terminal running it.

## Domain routing (search.mangwale.ai)

Two options:

1) Point the domain to this local NGINX:
   - Ensure firewall allows TCP/9000 or remap to 80 via the main reverse proxy.
   - Add a reverse-proxy rule (Traefik/Caddy/NGINX) to route `Host(search.mangwale.ai)` → `http://127.0.0.1:9000`.

2) Integrate directly into system NGINX (recommended):
   - Create `/etc/nginx/sites-available/search.mangwale.ai` with server block mapping the SPA root and API proxy to `127.0.0.1:3100`.
   - Symlink into `sites-enabled` and reload NGINX.
   - Note: Port 80 may already be owned by docker-proxy; adjust upstreams accordingly.

## Notes

- The e-commerce index currently lacks a `veg` field for most items, so `veg=1/0` filters can return zero; the facet may still show buckets if some items carry it. Populate `veg` during ingestion to fully enable the filter.
- Ready-to-eat and frozen categories are available through the UI; backend supports category filters via `category_id`.
- Logs:
  - API logs: `logs-api.txt` (from `npm run start:api` started in background)
  - NGINX logs: `nginx/access.log`, `nginx/error.log`
