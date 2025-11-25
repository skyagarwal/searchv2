# Mangwale Search - Production Deployment Guide

## 📋 Table of Contents
- [Overview](#overview)
- [System Requirements](#system-requirements)
- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Deployment Steps](#deployment-steps)
- [Configuration](#configuration)
- [Data Migration](#data-migration)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)
- [Backup & Recovery](#backup--recovery)

---

## 🎯 Overview

This is a complete, production-ready search system with:
- **OpenSearch 2.13** - Full-text and vector search engine
- **MySQL 8.0** - Source database with CDC (Change Data Capture)
- **Redis 7.2** - Caching layer
- **ClickHouse 24.3** - Analytics database
- **Redpanda** - Kafka-compatible streaming (CDC)
- **Debezium** - MySQL CDC connector
- **NestJS Search API** - REST API backend (port 3100)
- **React Frontend** - User interface (port 8080)
- **Embedding Service** - ML model for semantic search (port 3101)

**Architecture:**
```
[MySQL] --CDC--> [Redpanda/Kafka] --Debezium--> [OpenSearch]
                                                       ↓
[Frontend:8080] --> [Search API:3100] --> [OpenSearch + Redis + ClickHouse]
                                      ↓
                          [Embedding Service:3101]
```

---

## 💻 System Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Disk**: 50 GB SSD
- **Docker**: 24.0+
- **Docker Compose**: 2.20+

### Recommended for Production
- **CPU**: 8+ cores
- **RAM**: 16 GB+
- **Disk**: 100 GB+ SSD (NVMe preferred)
- **Network**: 1 Gbps+

### Port Requirements
Make sure these ports are available:
- `3100` - Search API
- `3101` - Embedding Service
- `3306` - MySQL
- `6379` - Redis
- `8080` - Frontend (Nginx)
- `8082` - Redpanda Proxy
- `8083` - Kafka Connect
- `8085` - Adminer (MySQL UI)
- `8123` - ClickHouse HTTP
- `9000` - ClickHouse Native
- `9092` - Redpanda/Kafka
- `9200` - OpenSearch
- `5601` - OpenSearch Dashboards

---

## ✅ Pre-deployment Checklist

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

### 2. Clone Repository
```bash
# Via HTTPS
git clone https://github.com/your-org/mangwale-search.git
cd mangwale-search

# OR via SSH
git clone git@github.com:your-org/mangwale-search.git
cd mangwale-search
```

### 3. System Optimizations
```bash
# Increase file descriptors (required for OpenSearch)
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Increase virtual memory (required for OpenSearch)
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Disable swap (recommended for production databases)
sudo swapoff -a
# Comment out swap line in /etc/fstab to make it permanent
```

---

## 🚀 Deployment Steps

### Step 1: Configure Environment Variables

```bash
# Copy template
cp .env.example .env

# Edit environment file
nano .env
```

**Required variables in `.env`:**
```bash
# MySQL Configuration
MYSQL_DATABASE=mangwale
MYSQL_ROOT_PASSWORD=your_secure_password_here
MYSQL_USER=root
MYSQL_PASSWORD=your_secure_password_here

# ClickHouse Configuration
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_clickhouse_password

# Optional: External MySQL source (for CDC)
MYSQL_HOST=your-production-mysql-host
MYSQL_PORT=3306
```

**Security Notes:**
- ⚠️ Change ALL default passwords
- ⚠️ Use strong passwords (16+ characters)
- ⚠️ Never commit `.env` to Git

### Step 2: Build and Start Services

```bash
# Pull latest images
docker-compose -f docker-compose.production.yml pull

# Build custom services (API, Frontend, Embedding)
docker-compose -f docker-compose.production.yml build

# Start all services in background
docker-compose -f docker-compose.production.yml up -d

# Watch logs
docker-compose -f docker-compose.production.yml logs -f
```

### Step 3: Verify All Services are Running

```bash
# Check container status
docker-compose -f docker-compose.production.yml ps

# Expected: All services should show "Up" or "Up (healthy)"
```

**Wait for health checks to pass** (this may take 1-2 minutes):
- ✅ OpenSearch: Green cluster status
- ✅ MySQL: Accepting connections
- ✅ Redis: Responding to PING
- ✅ Embedding Service: Model loaded
- ✅ Search API: Health endpoint returns 200

### Step 4: Initialize Databases

```bash
# Access MySQL container
docker exec -it mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD}

# Create database schema (if needed)
# Import your schema or use existing data
```

### Step 5: Create OpenSearch Indices

```bash
# For Food module
docker exec -it search-api node /app/dist/scripts/opensearch-setup-food.js

# For E-commerce module
docker exec -it search-api node /app/dist/scripts/opensearch-setup-ecom.js

# Verify indices created
curl http://localhost:9200/_cat/indices?v
```

### Step 6: Index Initial Data

**Option A: From MySQL (bulk index)**
```bash
# Index food items
docker exec -it search-api npm run db:index:mysql -- \
  --table menu_items \
  --id id \
  --fields id,name,description,category,price,rating \
  --index-alias food_items

# Index e-commerce products
docker exec -it search-api npm run db:index:mysql -- \
  --table products \
  --id id \
  --fields id,name,description,brand,category,price \
  --index-alias ecom_items
```

**Option B: Import from existing dump**
```bash
# If you have a MySQL dump
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} mangwale < your-dump.sql
```

### Step 7: Set Up CDC (Change Data Capture)

```bash
# Register Debezium MySQL connector
curl -X POST http://localhost:8083/connectors -H "Content-Type: application/json" -d '{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "root",
    "database.password": "'"${MYSQL_ROOT_PASSWORD}"'",
    "database.server.id": "1",
    "database.server.name": "mangwale",
    "database.include.list": "mangwale",
    "table.include.list": "mangwale.menu_items,mangwale.products,mangwale.stores",
    "database.history.kafka.bootstrap.servers": "redpanda:9092",
    "database.history.kafka.topic": "schema-changes",
    "include.schema.changes": "true"
  }
}'

# Verify connector status
curl http://localhost:8083/connectors/mysql-connector/status
```

### Step 8: Test the System

```bash
# Health check
curl http://localhost:3100/health

# Test search
curl "http://localhost:3100/search?q=pizza&module=food"

# Test suggestions
curl "http://localhost:3100/search/suggest?q=piz&module=food"

# Access frontend
open http://localhost:8080
# Or: curl http://localhost:8080
```

---

## ⚙️ Configuration

### OpenSearch Configuration

**Memory Settings:**
- Default: 2GB (`-Xms2g -Xmx2g`)
- For production with 16GB RAM: Set to 8GB
- Edit in `docker-compose.production.yml`:
  ```yaml
  OPENSEARCH_JAVA_OPTS: "-Xms8g -Xmx8g"
  ```

**Index Settings:**
Located in `apps/search-api/src/search/` - customize:
- Analyzers (language-specific)
- Tokenizers
- Number of shards/replicas
- Refresh intervals

### Search API Configuration

Environment variables in `docker-compose.production.yml`:
```yaml
environment:
  - NODE_ENV=production
  - PORT=3100
  - OPENSEARCH_HOST=http://opensearch:9200
  - REDIS_URL=redis://redis:6379/0
  - ENABLE_PERSONALIZATION=true
  - ENABLE_RERANKER=false
```

### Redis Configuration

Cache settings:
- Max memory: 512MB (adjust based on traffic)
- Eviction policy: `allkeys-lru`
- Persistence: Append-only file (AOF)

### ClickHouse Configuration

Analytics database for:
- Search query logs
- Trending searches
- User behavior analytics

Default user/password in `.env`:
```bash
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=clickhouse123
```

---

## 📊 Data Migration

### Migrating from Existing System

#### 1. Export MySQL Data
```bash
# On old server
mysqldump -u root -p mangwale > mangwale-backup.sql
gzip mangwale-backup.sql

# Transfer to new server
scp mangwale-backup.sql.gz user@new-server:/path/to/mangwale-search/
```

#### 2. Import to New MySQL
```bash
# On new server
gunzip mangwale-backup.sql.gz
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} mangwale < mangwale-backup.sql
```

#### 3. Re-index OpenSearch
```bash
# Run indexing scripts (see Step 6 above)
```

### Incremental Updates via CDC

Once CDC is set up, all changes to MySQL are automatically streamed to OpenSearch in real-time.

---

## 🏥 Monitoring & Health Checks

### Service Health Endpoints

```bash
# Search API
curl http://localhost:3100/health
# Expected: {"status":"ok","opensearch":"connected","redis":"connected"}

# Embedding Service
curl http://localhost:3101/health
# Expected: {"status":"healthy","model":"loaded"}

# OpenSearch
curl http://localhost:9200/_cluster/health
# Expected: {"status":"green"} or {"status":"yellow"}

# Redis
docker exec redis redis-cli ping
# Expected: PONG

# ClickHouse
curl http://localhost:8123/ping
# Expected: Ok.
```

### Monitoring Tools

**OpenSearch Dashboards:**
- URL: http://localhost:5601
- Monitor indices, queries, performance

**Adminer (MySQL UI):**
- URL: http://localhost:8085
- Server: mysql
- Username: root
- Password: (from .env)
- Database: mangwale

### Log Monitoring

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f search-api

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 opensearch
```

### Performance Metrics

```bash
# OpenSearch stats
curl http://localhost:9200/_stats?pretty

# Container stats
docker stats

# Disk usage
docker system df -v
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. OpenSearch won't start - "max virtual memory areas too low"
```bash
# Fix
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Restart OpenSearch
docker-compose -f docker-compose.production.yml restart opensearch
```

#### 2. Services can't connect to each other
```bash
# Check network
docker network inspect search_search-network

# Verify DNS resolution
docker exec search-api ping opensearch
docker exec search-api ping redis
```

#### 3. Search API returns 500 errors
```bash
# Check logs
docker logs search-api --tail=50

# Common causes:
# - OpenSearch not ready (wait for green status)
# - Redis connection failed
# - Missing environment variables
```

#### 4. Embedding Service out of memory
```bash
# Increase memory limit in docker-compose.production.yml
deploy:
  resources:
    limits:
      memory: 4G  # Increase from 2G
```

#### 5. CDC not working
```bash
# Check connector status
curl http://localhost:8083/connectors/mysql-connector/status

# Check Kafka topics
docker exec redpanda rpk topic list

# Verify MySQL binlog is enabled
docker exec mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -e "SHOW VARIABLES LIKE 'binlog_format'"
# Should show: ROW
```

### Reset Everything (Nuclear Option)

```bash
# Stop and remove containers
docker-compose -f docker-compose.production.yml down

# Remove volumes (⚠️ DELETES ALL DATA)
docker-compose -f docker-compose.production.yml down -v

# Remove images
docker-compose -f docker-compose.production.yml down --rmi all

# Start fresh
docker-compose -f docker-compose.production.yml up -d
```

---

## 💾 Backup & Recovery

### Automated Backup Script

Create `/home/ubuntu/backup-search.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/mangwale-search"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MySQL
docker exec mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} mangwale | gzip > $BACKUP_DIR/mysql_$DATE.sql.gz

# Backup OpenSearch indices
curl -X PUT "http://localhost:9200/_snapshot/backup_repo" -H 'Content-Type: application/json' -d '{
  "type": "fs",
  "settings": {
    "location": "/backups"
  }
}'

# Backup volumes
docker run --rm -v search_opensearch-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/opensearch_$DATE.tar.gz -C /data .
docker run --rm -v search_clickhouse-data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/clickhouse_$DATE.tar.gz -C /data .

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make it executable and add to cron:
```bash
chmod +x /home/ubuntu/backup-search.sh

# Run daily at 2 AM
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-search.sh
```

### Manual Backup

```bash
# MySQL
docker exec mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} mangwale > backup-$(date +%F).sql

# OpenSearch snapshot
curl -X PUT "localhost:9200/_snapshot/my_backup" -H 'Content-Type: application/json' -d '{
  "indices": "food_items,ecom_items,stores",
  "ignore_unavailable": true,
  "include_global_state": false
}'
```

### Restore from Backup

```bash
# Restore MySQL
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} mangwale < backup-2024-11-10.sql

# Restore OpenSearch
curl -X POST "localhost:9200/_snapshot/my_backup/_restore"
```

---

## 🔐 Security Hardening

### Production Checklist

- [ ] Change all default passwords
- [ ] Use strong passwords (16+ characters, mixed case, numbers, symbols)
- [ ] Enable OpenSearch security plugin (if needed)
- [ ] Configure firewall (UFW/iptables)
- [ ] Use SSL/TLS for external APIs (Nginx reverse proxy)
- [ ] Limit MySQL bind address to internal network
- [ ] Enable Redis authentication
- [ ] Regular security updates: `docker-compose pull && docker-compose up -d`
- [ ] Set up monitoring alerts
- [ ] Configure log rotation
- [ ] Regular backups (automated)

### Firewall Configuration

```bash
# Install UFW
sudo apt install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow only required ports from specific IPs
sudo ufw allow from YOUR_IP_ADDRESS to any port 8080 proto tcp  # Frontend
sudo ufw allow from YOUR_IP_ADDRESS to any port 3100 proto tcp  # API

# Deny all other incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable firewall
sudo ufw enable
```

---

## 📈 Scaling Considerations

### Horizontal Scaling

**Search API:**
- Run multiple instances behind load balancer
- Use Redis for shared session state
- Set `NODE_ENV=production`

**OpenSearch:**
- Add more nodes for cluster setup
- Update `discovery.type: "multi-node"`
- Configure node roles (master, data, ingest)

**Redis:**
- Use Redis Sentinel for HA
- Or Redis Cluster for sharding

### Vertical Scaling

**Increase resources in `docker-compose.production.yml`:**
```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      cpus: '2'
      memory: 4G
```

---

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs <service-name>`
2. Review this documentation
3. Check GitHub issues
4. Contact: support@mangwale.ai

---

## 📝 Changelog

### Version 1.0.0 (2024-11-10)
- Initial production deployment
- All services containerized
- CDC pipeline configured
- Health checks implemented
- Documentation completed

---

**Last Updated:** November 10, 2024
**Maintained by:** Mangwale Search Team
