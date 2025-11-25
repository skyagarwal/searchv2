# 🚀 Quick Deployment Reference Card

## Service Ports Summary

**Note:** Ports may vary if alternatives were assigned during deployment due to conflicts. Check deployment output for actual ports.

| Service | Default Port | Alternative Port | Access URL (Default) | HTTPS URL |
|---------|-------------|------------------|----------------------|-----------|
| **Frontend** | 6000 | 6010 | http://localhost:6000 | https://search.test.mangwale.ai |
| **Search API** | 3100 | 3110 | http://localhost:3100 | https://search.test.mangwale.ai/search |
| **API Docs** | 3100 | 3110 | http://localhost:3100/api-docs | https://search.test.mangwale.ai/api-docs |
| **Embedding Service** | 3101 | 3111 | http://localhost:3101 | - |
| **OpenSearch** | 9200 | 9210 | http://localhost:9200 | - |
| **OpenSearch Dashboards** | 5601 | 5611 | http://localhost:5601 | - |
| **MySQL** | 3306 | 3307 | mysql://localhost:3306 | - |
| **Redis** | 6379 | - | redis://172.17.0.1:6379/2 | - |
| **ClickHouse HTTP** | 8123 | 8124 | http://localhost:8123 | - |
| **ClickHouse Native** | 9000 | 9001 | tcp://localhost:9000 | - |
| **Redpanda/Kafka** | 9092 | 9093 | kafka://localhost:9092 | - |
| **Redpanda Proxy** | 8082 | 8083 | http://localhost:8082 | - |
| **Kafka Connect** | 8083 | 8084 | http://localhost:8083 | - |
| **Adminer** | 8085 | 8086 | http://localhost:8085 | - |

## Quick Deployment Commands

### 1. Initial Setup (Automated - Recommended)
```bash
# Clone repository
git clone <repo-url> SearchMangwaleAi
cd SearchMangwaleAi

# Make scripts executable
chmod +x deploy-staging.sh setup-nginx-https.sh

# Create environment file (if not exists)
# The script will create it automatically if missing

# Run full automated deployment
# This handles port conflicts automatically!
./deploy-staging.sh deploy

# After deployment, set up HTTPS
sudo ./setup-nginx-https.sh
sudo certbot --nginx -d search.test.mangwale.ai
```

### 2. Manual Deployment
```bash
# Build images
docker-compose -f docker-compose.production.yml build

# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Health Checks
```bash
# Search API
curl http://localhost:3100/health

# Embedding Service
curl http://localhost:3101/health

# OpenSearch
curl http://localhost:9200/_cluster/health

# ClickHouse
curl http://localhost:8123/ping
```

### 4. Setup Indices
```bash
# Food indices
docker exec search-api node /app/dist/scripts/opensearch-setup-food.js

# E-commerce indices
docker exec search-api node /app/dist/scripts/opensearch-setup-ecom.js

# Verify
curl http://localhost:9200/_cat/indices?v
```

### 5. Test Search
```bash
# Basic search
curl "http://localhost:3100/search?q=pizza&module=food"

# With filters
curl "http://localhost:3100/search?q=pizza&module=food&veg=1&price_min=100"

# Suggestions
curl "http://localhost:3100/search/suggest?q=piz&module=food"
```

## Service Dependencies

```
Start Order:
1. Infrastructure: OpenSearch, MySQL, ClickHouse, Redpanda
2. CDC: Kafka Connect
3. Application: Embedding Service → Search API → Frontend
4. Utilities: Adminer, Dashboards
```

## Common Issues & Fixes

### Port Conflicts
**NEW:** The deployment script now handles this automatically! It will detect conflicts and use alternative ports.

To check assigned ports:
```bash
./deploy-staging.sh info
# or
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### OpenSearch won't start
```bash
sudo sysctl -w vm.max_map_count=262144
docker-compose -f docker-compose.production.yml restart opensearch
```

### Services can't connect
```bash
docker network inspect search_search-network
docker exec search-api ping opensearch
```

### Check logs
```bash
docker-compose -f docker-compose.production.yml logs -f search-api
docker logs search-api --tail=100
```

## Restart Services
```bash
# All services
docker-compose -f docker-compose.production.yml restart

# Specific service
docker-compose -f docker-compose.production.yml restart search-api
```

## Stop/Start
```bash
# Stop
docker-compose -f docker-compose.production.yml stop

# Start
docker-compose -f docker-compose.production.yml start

# Down (removes containers)
docker-compose -f docker-compose.production.yml down
```

## Update & Redeploy
```bash
git pull
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

## Network Configuration

- **Docker Network**: `search-network` (172.25.0.0/16)
- **External Network**: `mangwale_unified_network` (for Redis)
- **Redis**: External container at 172.17.0.1:6379
- **MySQL**: External server at 103.160.107.41:3306

## Environment Variables

Key variables in `.env.production`:
- `MYSQL_HOST=103.160.107.41`
- `MYSQL_PASSWORD=test@mangwale2025`
- `REDIS_URL=redis://172.17.0.1:6379/2`
- `OPENSEARCH_HOST=http://opensearch:9200`
- `EMBEDDING_SERVICE_URL=http://embedding-service:3101`

## Full Documentation

See `STAGING_DEPLOYMENT_GUIDE.md` for complete instructions.

