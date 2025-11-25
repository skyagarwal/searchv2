# 🚀 Mangwale Search - Complete Staging Deployment Guide

## 📋 Table of Contents
1. [System Architecture & Ports](#system-architecture--ports)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Configuration Files](#configuration-files)
5. [Service Dependencies](#service-dependencies)
6. [Post-Deployment Setup](#post-deployment-setup)
7. [Verification & Testing](#verification--testing)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ System Architecture & Ports

### Port Conflict Management

**NEW:** The deployment script now automatically detects port conflicts and assigns alternative ports if needed. This ensures deployment won't fail if ports are already in use.

**Port Mapping with Alternatives:**

| Service | Preferred Port | Alternative Port | Internal Port | Protocol |
|---------|---------------|-------------------|---------------|----------|
| **Search API** | 3100 | 3110 | 3100 | HTTP |
| **Search Frontend** | 6000 | 6010 | 80 | HTTP |
| **Embedding Service** | 3101 | 3111 | 3101 | HTTP |
| **OpenSearch** | 9200 | 9210 | 9200 | HTTP |
| **OpenSearch Dashboards** | 5601 | 5611 | 5601 | HTTP |
| **MySQL** | 3306 | 3307 | 3306 | TCP |
| **ClickHouse HTTP** | 8123 | 8124 | 8123 | HTTP |
| **ClickHouse Native** | 9000 | 9001 | 9000 | TCP |
| **Redpanda Kafka** | 9092 | 9093 | 9092 | TCP |
| **Redpanda Proxy** | 8082 | 8083 | 8082 | HTTP |
| **Kafka Connect** | 8083 | 8084 | 8083 | HTTP |
| **Adminer** | 8085 | 8086 | 8080 | HTTP |

**Note:** The deployment script will automatically check port availability and use alternatives if needed. The actual ports used will be displayed during deployment.

### Complete Service Port Mapping

| Service | Container Name | Internal Port | External Port (Default) | External Port (Alternative) | Protocol | Purpose |
|---------|---------------|----------------|-------------------------|----------------------------|----------|---------|
| **Search API** | `search-api` | 3100 | 3100 | 3110 | HTTP | NestJS REST API backend |
| **Search Frontend** | `search-frontend` | 80 | 6000 | 6010 | HTTP | React/Vite web application |
| **Embedding Service** | `embedding-service` | 3101 | 3101 | 3111 | HTTP | ML model for semantic search |
| **OpenSearch** | `opensearch` | 9200 | 9200 | 9210 | HTTP | Search engine |
| **OpenSearch Dashboards** | `opensearch-dashboards` | 5601 | 5601 | 5611 | HTTP | OpenSearch management UI |
| **MySQL** | `mysql` | 3306 | 3306 | 3307 | TCP | Primary database |
| **Redis** | External (mangwale_redis) | 6379 | 6379 | N/A | TCP | Caching layer |
| **ClickHouse** | `clickhouse` | 8123, 9000 | 8123, 9000 | 8124, 9001 | HTTP/TCP | Analytics database |
| **Redpanda** | `redpanda` | 9092, 8082 | 9092, 8082 | 9093, 8083 | TCP/HTTP | Kafka-compatible streaming |
| **Kafka Connect** | `kafka-connect` | 8083 | 8083 | 8084 | HTTP | Debezium CDC connector |
| **Adminer** | `adminer` | 8080 | 8085 | 8086 | HTTP | MySQL admin UI |

### Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network: search-network           │
│                    Subnet: 172.25.0.0/16                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│  Search API  │────▶│  OpenSearch  │
│   Port 6000  │     │   Port 3100  │     │   Port 9200  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            │                      │
                            ▼                      ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Embedding   │     │    MySQL     │
                    │   Port 3101  │     │   Port 3306  │
                    └──────────────┘     └──────────────┘
                                              │
                                              │ CDC
                                              ▼
                                    ┌──────────────┐
                                    │  Redpanda    │
                                    │  Port 9092   │
                                    └──────────────┘
                                              │
                                              ▼
                                    ┌──────────────┐
                                    │Kafka Connect │
                                    │  Port 8083   │
                                    └──────────────┘

External Services:
- Redis: 172.17.0.1:6379 (mangwale_redis container)
- MySQL (Production): 103.160.107.41:3306 (external)
```

### Service Dependencies

```
Frontend (6000)
  └─▶ Search API (3100)
        ├─▶ OpenSearch (9200)
        ├─▶ MySQL (3306) - External: 103.160.107.41
        ├─▶ Redis (6379) - External: 172.17.0.1
        ├─▶ ClickHouse (8123)
        └─▶ Embedding Service (3101)
              └─▶ ML Model (in-memory)

MySQL (3306)
  └─▶ Redpanda (9092) [via CDC]
        └─▶ Kafka Connect (8083)
              └─▶ OpenSearch (9200)
```

---

## ✅ Prerequisites

### 1. Server Requirements

**Minimum:**
- OS: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- CPU: 4 cores
- RAM: 8 GB
- Disk: 50 GB SSD
- Docker: 24.0+
- Docker Compose: 2.20+

**Recommended for Staging:**
- CPU: 8+ cores
- RAM: 16 GB+
- Disk: 100 GB+ SSD
- Network: 1 Gbps

### 2. Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### 3. System Optimizations

```bash
# Increase file descriptors (required for OpenSearch)
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Increase virtual memory (required for OpenSearch)
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify
sysctl vm.max_map_count  # Should show: 262144
ulimit -n  # Should show: 65536
```

### 4. Port Availability Check

```bash
# Check if ports are available
for port in 3100 3101 3306 6000 8083 8085 8123 9000 9092 9200 5601; do
  if sudo netstat -tuln | grep -q ":$port "; then
    echo "⚠️  Port $port is already in use"
  else
    echo "✅ Port $port is available"
  fi
done
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Clone Repository to Staging Server

```bash
# SSH into your staging server
ssh user@your-staging-server

# Navigate to deployment directory
cd /srv  # or your preferred location

# Clone the repository
git clone <your-git-repo-url> SearchMangwaleAi
cd SearchMangwaleAi

# Verify you're on the correct branch
git branch
git checkout main  # or your staging branch

# Make deployment script executable
chmod +x deploy-staging.sh
chmod +x setup-nginx-https.sh
```

### Step 2: Create Environment Configuration

Create `.env.production` file:

```bash
cat > .env.production << 'EOF'
# ============================================
# MySQL Configuration
# ============================================
MYSQL_DATABASE=migrated_db
MYSQL_HOST=103.160.107.41
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=test@mangwale2025

# ============================================
# Redis Configuration (External)
# ============================================
REDIS_URL=redis://172.17.0.1:6379/2

# ============================================
# OpenSearch Configuration
# ============================================
OPENSEARCH_HOST=http://opensearch:9200
OPENSEARCH_USERNAME=
OPENSEARCH_PASSWORD=

# ============================================
# ClickHouse Configuration
# ============================================
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=clickhouse123
CLICKHOUSE_HOST=http://clickhouse:8123

# ============================================
# Kafka/Redpanda Configuration
# ============================================
KAFKA_BROKERS=redpanda:9092

# ============================================
# Application Configuration
# ============================================
NODE_ENV=production
PORT=3100
ENABLE_SEARCH_CACHE=true
EMBEDDING_SERVICE_URL=http://embedding-service:3101

# ============================================
# Security (Change these!)
# ============================================
# API_KEY=your-secure-api-key-here
# JWT_SECRET=your-jwt-secret-here
EOF

# Set proper permissions
chmod 600 .env.production
```

### Step 3: Create Docker Network (if needed)

```bash
# Check if mangwale_unified_network exists
docker network ls | grep mangwale_unified_network

# If not, create it (or it will be created automatically)
docker network create mangwale_unified_network 2>/dev/null || true
```

### Step 4: Automated Deployment (Recommended)

**NEW:** Use the enhanced deployment script that handles port conflicts automatically:

```bash
# Run full automated deployment
./deploy-staging.sh deploy
```

This script will:
- ✅ Check all prerequisites
- ✅ Detect port conflicts and assign alternatives automatically
- ✅ Update docker-compose.production.yml with assigned ports
- ✅ Build all Docker images
- ✅ Start all services in correct order
- ✅ Set up OpenSearch indices
- ✅ Run health checks
- ✅ Configure Nginx for HTTPS (if run as root)
- ✅ Display access information with actual ports used

**Alternative: Manual Deployment**

If you prefer manual deployment:

```bash
# Pull base images
docker-compose -f docker-compose.production.yml pull

# Build custom services (this may take 10-15 minutes)
docker-compose -f docker-compose.production.yml build --no-cache

# Verify images were built
docker images | grep -E "search-api|search-frontend|embedding-service"
```

**Expected output:**
```
REPOSITORY              TAG       IMAGE ID       CREATED         SIZE
searchmangwaleai_search-api        latest    abc123def456   2 minutes ago   500MB
searchmangwaleai_search-frontend    latest    def456ghi789   1 minute ago   200MB
searchmangwaleai_embedding-service  latest    ghi789jkl012   3 minutes ago   2.5GB
```

### Step 5: Start Infrastructure Services First

```bash
# Start base infrastructure (without API/Frontend)
docker-compose -f docker-compose.production.yml up -d \
  opensearch \
  opensearch-dashboards \
  mysql \
  clickhouse \
  redpanda \
  kafka-connect

# Wait for services to be healthy (2-3 minutes)
echo "Waiting for infrastructure services..."
sleep 60

# Check OpenSearch health
curl -s http://localhost:9200/_cluster/health | jq .

# Check MySQL
docker exec mysql mysqladmin ping -h localhost -uroot -psecret 2>/dev/null && echo "✅ MySQL is ready"

# Check ClickHouse
curl -s http://localhost:8123/ping && echo "✅ ClickHouse is ready"
```

### Step 6: Start Application Services

```bash
# Start embedding service first (takes time to load model)
docker-compose -f docker-compose.production.yml up -d embedding-service

# Wait for embedding service
echo "Waiting for embedding service to load model (30-60 seconds)..."
sleep 30
curl -s http://localhost:3101/health | jq .

# Start Search API
docker-compose -f docker-compose.production.yml up -d search-api

# Wait for API to be ready
echo "Waiting for Search API..."
sleep 20
curl -s http://localhost:3100/health | jq .

# Start Frontend
docker-compose -f docker-compose.production.yml up -d search-frontend

# Wait for frontend
sleep 10
curl -s http://localhost:6000 | head -20
```

### Step 7: Start Utility Services

```bash
# Start Adminer (MySQL UI)
docker-compose -f docker-compose.production.yml up -d adminer
```

### Step 8: Verify All Services

```bash
# Check all containers are running
docker-compose -f docker-compose.production.yml ps

# Expected: All services should show "Up" or "Up (healthy)"
```

---

## 📝 Configuration Files

### 1. `.env.production` (Already created in Step 2)

### 2. `docker-compose.production.yml` (Already exists)

Key configurations:
- **Network**: `search-network` (172.25.0.0/16)
- **Redis**: Uses external `mangwale_redis` at 172.17.0.1:6379
- **MySQL**: Connects to external production MySQL at 103.160.107.41:3306

### 3. `docker-compose.override.yml` (Already exists)

This file:
- Disables local Redis container
- Configures Redis connection to external service
- Connects to `mangwale_unified_network`

### 4. Nginx Configuration (Inside Frontend Container)

The frontend container uses `/nginx/search.conf` which:
- Serves static files on port 80
- Proxies API requests to `search-api:3100`
- Handles SPA routing

### 5. Caddyfile (Optional - for reverse proxy with SSL)

If you want to use Caddy instead of host-level Nginx:

```bash
# The Caddyfile is already configured
# To enable Caddy, uncomment the caddy service in docker-compose.production.yml
```

---

## 🔗 Service Dependencies

### Startup Order

1. **Infrastructure Layer** (Start first):
   - OpenSearch (9200)
   - MySQL (3306) - or connect to external
   - ClickHouse (8123)
   - Redpanda (9092)

2. **CDC Layer**:
   - Kafka Connect (8083) - depends on Redpanda + MySQL

3. **Application Layer**:
   - Embedding Service (3101) - loads ML model
   - Search API (3100) - depends on OpenSearch, Redis, MySQL, Embedding
   - Frontend (6000) - depends on Search API

4. **Utility Layer**:
   - Adminer (8085) - depends on MySQL
   - OpenSearch Dashboards (5601) - depends on OpenSearch

### Health Check Endpoints

```bash
# Search API
curl http://localhost:3100/health
# Expected: {"status":"ok","opensearch":"connected","redis":"connected"}

# Embedding Service
curl http://localhost:3101/health
# Expected: {"ok":true,"model":"all-MiniLM-L6-v2","dimensions":384,"device":"cpu"}

# OpenSearch
curl http://localhost:9200/_cluster/health
# Expected: {"status":"green"} or {"status":"yellow"}

# ClickHouse
curl http://localhost:8123/ping
# Expected: Ok.

# Kafka Connect
curl http://localhost:8083/
# Expected: HTML page with connector info
```

---

## 🔧 Post-Deployment Setup

### 1. Create OpenSearch Indices

```bash
# Wait for OpenSearch to be ready
until curl -s http://localhost:9200/_cluster/health | grep -q "green\|yellow"; do
  echo "Waiting for OpenSearch..."
  sleep 5
done

# Create Food module indices
docker exec search-api node /app/dist/scripts/opensearch-setup-food.js

# Create E-commerce module indices
docker exec search-api node /app/dist/scripts/opensearch-setup-ecom.js

# Verify indices
curl -s http://localhost:9200/_cat/indices?v
```

**Expected indices:**
```
green  open food_items_v3         5 1   0 0    208b   104b
green  open ecom_items_v3         5 1   0 0    208b   104b
green  open stores                5 1   0 0    208b   104b
```

### 2. Index Initial Data (Optional)

If you have data to index:

```bash
# Index food items from MySQL
docker exec search-api npm run db:index:mysql -- \
  --table menu_items \
  --id id \
  --fields id,name,description,category,price,rating \
  --index-alias food_items

# Index e-commerce products
docker exec search-api npm run db:index:mysql -- \
  --table products \
  --id id \
  --fields id,name,description,brand,category,price \
  --index-alias ecom_items
```

### 3. Set Up CDC (Change Data Capture)

```bash
# Wait for Kafka Connect to be ready
until curl -s http://localhost:8083/ > /dev/null; do
  echo "Waiting for Kafka Connect..."
  sleep 5
done

# Register Debezium MySQL connector
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "mysql-connector",
    "config": {
      "connector.class": "io.debezium.connector.mysql.MySqlConnector",
      "database.hostname": "103.160.107.41",
      "database.port": "3306",
      "database.user": "root",
      "database.password": "test@mangwale2025",
      "database.server.id": "1",
      "database.server.name": "mangwale",
      "database.include.list": "migrated_db",
      "table.include.list": "migrated_db.menu_items,migrated_db.products,migrated_db.stores",
      "database.history.kafka.bootstrap.servers": "redpanda:9092",
      "database.history.kafka.topic": "schema-changes",
      "include.schema.changes": "true"
    }
  }'

# Verify connector status
curl -s http://localhost:8083/connectors/mysql-connector/status | jq .
```

### 4. Configure Reverse Proxy with HTTPS (Nginx on Host)

**For search.test.mangwale.ai with HTTPS:**

**Option 1: Automated Setup (Recommended)**

```bash
# The deployment script can set up Nginx automatically if run as root
# Or run separately:
sudo ./setup-nginx-https.sh
```

**Option 2: Manual Setup**

```bash
# Copy the Nginx configuration template
sudo cp nginx/search.test.mangwale.ai.conf /etc/nginx/sites-available/search.test.mangwale.ai

# IMPORTANT: Update ports in the config file if alternatives were used
# Edit the file and replace:
#   - 3100 with actual Search API port (check deployment output)
#   - 6000 with actual Frontend port (check deployment output)

sudo nano /etc/nginx/sites-available/search.test.mangwale.ai

# Enable site
sudo ln -sf /etc/nginx/sites-available/search.test.mangwale.ai /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Install SSL certificates with Let's Encrypt
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d search.test.mangwale.ai

# Reload Nginx
sudo systemctl reload nginx
```

**Note:** The Nginx configuration file (`nginx/search.test.mangwale.ai.conf`) uses default ports (3100 for API, 6000 for Frontend). If the deployment script assigned alternative ports, you must update the configuration file accordingly.

**To find actual ports used:**
```bash
# Check docker-compose.production.yml
grep -A 1 "ports:" docker-compose.production.yml

# Or check running containers
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## ✅ Verification & Testing

### 1. Service Health Checks

```bash
#!/bin/bash
# health-check.sh

echo "🔍 Running Health Checks..."

# Search API
echo -n "Search API: "
if curl -s http://localhost:3100/health | grep -q "ok"; then
  echo "✅ Healthy"
else
  echo "❌ Unhealthy"
fi

# Embedding Service
echo -n "Embedding Service: "
if curl -s http://localhost:3101/health | grep -q "ok"; then
  echo "✅ Healthy"
else
  echo "❌ Unhealthy"
fi

# OpenSearch
echo -n "OpenSearch: "
if curl -s http://localhost:9200/_cluster/health | grep -q "green\|yellow"; then
  echo "✅ Healthy"
else
  echo "❌ Unhealthy"
fi

# ClickHouse
echo -n "ClickHouse: "
if curl -s http://localhost:8123/ping | grep -q "Ok"; then
  echo "✅ Healthy"
else
  echo "❌ Unhealthy"
fi

# Frontend
echo -n "Frontend: "
if curl -s http://localhost:6000 | grep -q "<!DOCTYPE html>"; then
  echo "✅ Accessible"
else
  echo "❌ Not accessible"
fi
```

### 2. Test Search Endpoints

```bash
# Basic search
curl "http://localhost:3100/search?q=pizza&module=food"

# Search with filters
curl "http://localhost:3100/search?q=pizza&module=food&veg=1&price_min=100&price_max=500"

# Suggestions
curl "http://localhost:3100/search/suggest?q=piz&module=food"

# Health check
curl http://localhost:3100/health

# API Documentation
curl http://localhost:3100/api-docs-json | jq .info
```

### 3. Test Frontend

```bash
# Open in browser
# http://your-server-ip:6000
# or
# http://search.mangwale.ai (if DNS configured)
```

### 4. Check Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f search-api
docker-compose -f docker-compose.production.yml logs -f embedding-service
docker-compose -f docker-compose.production.yml logs -f opensearch
```

---

## 🐛 Troubleshooting

### Issue 1: Port Conflicts

**Error:** Port already in use

**Solution:**
The deployment script now handles this automatically! It will:
- Detect if a port is in use
- Automatically assign an alternative port
- Update docker-compose.production.yml accordingly

If you need to manually check ports:
```bash
# Check which ports are in use
sudo netstat -tuln | grep LISTEN
# or
sudo ss -tuln | grep LISTEN

# The deployment script will show assigned ports
./deploy-staging.sh deploy
```

**Note:** If alternative ports are used, remember to update Nginx configuration accordingly.

### Issue 2: OpenSearch won't start

**Error:** `max virtual memory areas too low`

**Solution:**
```bash
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
docker-compose -f docker-compose.production.yml restart opensearch
```

### Issue 3: Services can't connect to each other

**Check network:**
```bash
docker network inspect search_search-network
docker exec search-api ping opensearch
docker exec search-api ping redis
```

**Solution:**
```bash
# Recreate network
docker-compose -f docker-compose.production.yml down
docker network prune -f
docker-compose -f docker-compose.production.yml up -d
```

### Issue 4: Search API returns 500 errors

**Check logs:**
```bash
docker logs search-api --tail=100
```

**Common causes:**
- OpenSearch not ready (wait for green status)
- Redis connection failed (check external Redis)
- Missing environment variables
- MySQL connection failed

**Solution:**
```bash
# Check OpenSearch
curl http://localhost:9200/_cluster/health

# Check Redis (external)
docker exec mangwale_redis redis-cli ping

# Check MySQL connection
docker exec search-api node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: '103.160.107.41',
  port: 3306,
  user: 'root',
  password: 'test@mangwale2025'
}).then(() => console.log('✅ MySQL connected')).catch(e => console.error('❌', e));
"
```

### Issue 5: Embedding Service out of memory

**Solution:**
Edit `docker-compose.production.yml`:
```yaml
embedding-service:
  deploy:
    resources:
      limits:
        memory: 4G  # Increase from 2G
```

Then restart:
```bash
docker-compose -f docker-compose.production.yml up -d embedding-service
```

### Issue 6: Frontend can't connect to API

**Check:**
```bash
# From inside frontend container
docker exec search-frontend wget -O- http://search-api:3100/health

# Check nginx config
docker exec search-frontend cat /etc/nginx/conf.d/default.conf
```

**Solution:**
- Verify both containers are on same network
- Check API is accessible from frontend container
- Verify nginx proxy configuration

### Issue 7: HTTPS/SSL Certificate Issues

**Error:** SSL certificate not found or invalid

**Solution:**
```bash
# Install certbot if not installed
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d search.test.mangwale.ai

# Test certificate renewal
sudo certbot renew --dry-run

# If certificate exists but Nginx can't find it, check path:
ls -la /etc/letsencrypt/live/search.test.mangwale.ai/

# Update Nginx config if certificate path is different
sudo nano /etc/nginx/sites-available/search.test.mangwale.ai
```

### Issue 8: CDC not working

**Check connector:**
```bash
curl http://localhost:8083/connectors/mysql-connector/status | jq .
```

**Check Kafka topics:**
```bash
docker exec redpanda rpk topic list
```

**Verify MySQL binlog:**
```bash
# On MySQL server (103.160.107.41)
mysql -uroot -p -e "SHOW VARIABLES LIKE 'binlog_format'"
# Should show: ROW
```

---

## 📊 Monitoring Commands

### Container Status
```bash
docker-compose -f docker-compose.production.yml ps
```

### Resource Usage
```bash
docker stats --no-stream
```

### Disk Usage
```bash
docker system df -v
```

### OpenSearch Stats
```bash
curl http://localhost:9200/_stats?pretty
curl http://localhost:9200/_cat/indices?v
curl http://localhost:9200/_cat/nodes?v
```

### Log Monitoring
```bash
# Follow all logs
docker-compose -f docker-compose.production.yml logs -f

# Last 100 lines of specific service
docker-compose -f docker-compose.production.yml logs --tail=100 search-api
```

---

## 🔄 Common Operations

### Restart All Services
```bash
docker-compose -f docker-compose.production.yml restart
```

### Restart Specific Service
```bash
docker-compose -f docker-compose.production.yml restart search-api
```

### Stop All Services
```bash
docker-compose -f docker-compose.production.yml stop
```

### Start All Services
```bash
docker-compose -f docker-compose.production.yml start
```

### Update and Redeploy
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### Clean Everything (⚠️ DELETES DATA)
```bash
docker-compose -f docker-compose.production.yml down -v
```

---

## 📞 Quick Reference

### Access URLs

**Production Domain (HTTPS):**
- **Frontend**: https://search.test.mangwale.ai
- **Search API**: https://search.test.mangwale.ai/search
- **API Docs**: https://search.test.mangwale.ai/api-docs

**Local Access (HTTP):**
- **Frontend**: http://localhost:6000 (or alternative port if assigned)
- **Search API**: http://localhost:3100 (or alternative port if assigned)
- **API Docs**: http://localhost:3100/api-docs (or alternative port)
- **OpenSearch**: http://localhost:9200 (or alternative port)
- **OpenSearch Dashboards**: http://localhost:5601 (or alternative port)
- **Adminer (MySQL UI)**: http://localhost:8085 (or alternative port)
- **ClickHouse**: http://localhost:8123 (or alternative port)
- **Kafka Connect**: http://localhost:8083 (or alternative port)

**Note:** Actual ports may differ if alternatives were assigned during deployment. Check the deployment output or run `./deploy-staging.sh info` to see current port assignments.

### Important Files
- `.env.production` - Environment variables
- `docker-compose.production.yml` - Main compose file
- `docker-compose.override.yml` - Override for external services
- `Caddyfile` - Reverse proxy config (optional)

### Key Directories
- `apps/search-api/` - NestJS API source
- `apps/search-web/` - React frontend source
- `scripts/` - Setup and indexing scripts
- `nginx/` - Nginx configuration

---

## ✅ Deployment Checklist

- [ ] Server meets minimum requirements
- [ ] Docker and Docker Compose installed
- [ ] System optimizations applied (vm.max_map_count, nofile)
- [ ] Repository cloned
- [ ] `.env.production` created and configured
- [ ] Docker images built successfully
- [ ] All services started and healthy
- [ ] OpenSearch indices created
- [ ] Initial data indexed (if applicable)
- [ ] CDC connector configured (if needed)
- [ ] Reverse proxy configured (if using)
- [ ] Health checks passing
- [ ] Search endpoints tested
- [ ] Frontend accessible
- [ ] Logs monitored for errors
- [ ] Firewall rules configured
- [ ] Backups scheduled (if needed)

---

**Last Updated:** $(date)
**Version:** 1.0.0
**Maintained by:** Mangwale Search Team

