# Mangwale Search - Self-hosted Stack

This repository contains a local, self-hosted stack to run the cross-module search system (Food & E-com) with OpenSearch, Redpanda (Kafka API), MySQL, Redis, and ClickHouse.

## What’s included
- OpenSearch 2.x + Dashboards
- MySQL 8 (binlog enabled for CDC)
- Redpanda (Kafka-compatible) + Kafka Connect (for Debezium)
- Redis 7
- ClickHouse 24.x (analytics)
- Adminer (MySQL UI)

## Quick start
1. Copy env template:
   cp .env.example .env
2. Start services:
   docker compose up -d
3. Verify health:
   - API & Frontend: http://localhost (via Traefik, requires Host header `search.test.mangwale.ai` or DNS)
   - Traefik Dashboard: http://localhost:8081
   - Internal services (MySQL, Redis, OpenSearch) are isolated on `search-network`.

## Accessing Services
The stack uses Traefik as a reverse proxy.
- **API**: `http://search.test.mangwale.ai/search` (Mapped to localhost:80)
- **Frontend**: `http://search.test.mangwale.ai/` (Mapped to localhost:80)

To access locally, add to your `/etc/hosts`:
```
127.0.0.1 search.test.mangwale.ai
```

## Real data workflow
- Add Debezium MySQL connector to Kafka Connect to stream DB changes.
- Scaffold Nest.js `apps/search-api` and indexer workers.
- Define index schemas & analyzers, then bootstrap collections.

## Real data workflow

1) Import your MySQL dump into the local container (db: mangwale by default)
- npm run db:import:sql ./path/to/your-dump.sql
- npm run db:import:sql ./path/to/your-dump.sql.gz

2) Introspect schema and write a report
- npm run db:introspect > mysql-schema-summary.json

3) Bulk index a table or custom query into OpenSearch
- npm run db:index:mysql -- --table products --id id --fields id,name,description,brand,category,price --index-alias ecom_items
- npm run db:index:mysql -- --sql "SELECT id,name,description,brand,category,price FROM menu_items WHERE active=1" --id id --index-alias food_items

Environment overrides: MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD, OPENSEARCH_HOST, OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD.

## New filters & endpoints

- Items: `rating_min`, `open_now` (food only), existing `veg`, `category_id`, `price_min/max`. Geo boost via `lat`/`lon` and optional `radius_km`.
- Stores: `delivery_time_max` (parses first number of `delivery_time` like `30-40 min`). Geo sort supported.
- Ecom endpoints are now available:
   - GET /search/ecom
   - GET /search/ecom/stores
   - GET /search/ecom/suggest
- Analytics: GET /analytics/trending?window=7d&module=food|ecom&time_of_day=morning|afternoon|evening|night

## Demo web UI

A lightweight React app is included to test module-wise search, suggestions, geo sliders, and filters.

Run it:

```
npm run web:dev
```

It proxies to the API via Traefik (http://localhost:80). Make sure your Docker stack is running.

If the CDC consumer runs on host, export KAFKA_BROKER=localhost:9092 before starting it. If you see the frontend but suggestions are empty, verify indices with `_cat/indices` and re-run the index scripts.

## Index setup (Shop/Ecom)

Seed indices for Shop (module 5) and index data:

```bash
node scripts/opensearch-setup-ecom.js
bash scripts/index-ecom.sh
```

If you run the CDC consumer from host, set:

```bash
export KAFKA_BROKER=localhost:9092
node scripts/cdc-to-opensearch.js
```
