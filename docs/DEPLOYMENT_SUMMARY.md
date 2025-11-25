# 📋 Mangwale Search - Deployment Summary

## 🎯 Overview

This is a comprehensive search system deployed using Docker Compose with the following architecture:

**Production Domain:** https://search.test.mangwale.ai

**Service Ports (with automatic conflict resolution):**
- **Search API** (NestJS) - Port 3100 (alternative: 3110)
- **Frontend** (React/Vite) - Port 6000 (alternative: 6010)
- **Embedding Service** (Python/FastAPI) - Port 3101 (alternative: 3111)
- **OpenSearch** - Port 9200 (alternative: 9210)
- **MySQL** - Port 3306 (alternative: 3307, External: 103.160.107.41)
- **Redis** - Port 6379 (External: 172.17.0.1)
- **ClickHouse** - Ports 8123, 9000 (alternatives: 8124, 9001)
- **Redpanda** - Ports 9092, 8082 (alternatives: 9093, 8083)
- **Kafka Connect** - Port 8083 (alternative: 8084)
- **Adminer** - Port 8085 (alternative: 8086)
- **OpenSearch Dashboards** - Port 5601 (alternative: 5611)

**NEW Features:**
- ✅ Automatic port conflict detection and resolution
- ✅ HTTPS support with Let's Encrypt
- ✅ Enhanced deployment script with health checks
- ✅ Nginx reverse proxy configuration

## 📚 Documentation Files

1. **STAGING_DEPLOYMENT_GUIDE.md** - Complete step-by-step deployment guide
2. **DEPLOYMENT_QUICK_REFERENCE.md** - Quick command reference
3. **DEPLOYMENT.md** - Original deployment documentation
4. **This file** - Summary and overview

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# 1. Clone repository
git clone <your-repo-url> SearchMangwaleAi
cd SearchMangwaleAi

# 2. Make scripts executable
chmod +x deploy-staging.sh setup-nginx-https.sh

# 3. Run full automated deployment
# This will:
#   - Check prerequisites
#   - Handle port conflicts automatically
#   - Build and start all services
#   - Set up indices
#   - Configure Nginx (if run as root)
./deploy-staging.sh deploy

# 4. Set up HTTPS (if not done automatically)
sudo ./setup-nginx-https.sh
sudo certbot --nginx -d search.test.mangwale.ai
```

**Note:** The deployment script automatically creates `.env.production` if it doesn't exist. You can edit it before or after deployment.

### Option 2: Manual Deployment

```bash
# 1. System setup
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# 2. Build and start
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# 3. Wait for services (2-3 minutes)
sleep 120

# 4. Setup indices
docker exec search-api node /app/dist/scripts/opensearch-setup-food.js
docker exec search-api node /app/dist/scripts/opensearch-setup-ecom.js

# 5. Verify
curl http://localhost:3100/health
```

## 🔌 Service Ports & Access

### Production Access (HTTPS)
- **Frontend**: https://search.test.mangwale.ai
- **Search API**: https://search.test.mangwale.ai/search
- **API Documentation**: https://search.test.mangwale.ai/api-docs

### Local Access (HTTP)
**Note:** Ports may differ if alternatives were assigned. Check deployment output.

- **Frontend**: http://localhost:6000 (or 6010)
- **Search API**: http://localhost:3100 (or 3110)
- **API Documentation**: http://localhost:3100/api-docs (or 3110)
- **Embedding Service**: http://localhost:3101 (or 3111)
- **OpenSearch**: http://localhost:9200 (or 9210)
- **OpenSearch Dashboards**: http://localhost:5601 (or 5611)
- **MySQL**: localhost:3306 (or 3307, or external: 103.160.107.41:3306)
- **Redis**: 172.17.0.1:6379 (external container)
- **ClickHouse HTTP**: http://localhost:8123 (or 8124)
- **ClickHouse Native**: localhost:9000 (or 9001)
- **Redpanda/Kafka**: localhost:9092 (or 9093)
- **Kafka Connect**: http://localhost:8083 (or 8084)
- **Adminer**: http://localhost:8085 (or 8086)

**To check actual ports:**
```bash
./deploy-staging.sh info
# or
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Docker Network: search-network              │
│                   Subnet: 172.25.0.0/16                  │
└─────────────────────────────────────────────────────────┘

Frontend (6000) → Search API (3100) → OpenSearch (9200)
                            ↓
                    ┌───────┴────────┐
                    │                │
              MySQL (3306)    Embedding (3101)
              External:              ↓
              103.160.107.41    ML Model
                    │
                    │ CDC
                    ↓
              Redpanda (9092)
                    ↓
            Kafka Connect (8083)
                    ↓
              OpenSearch (9200)

External Services:
- Redis: 172.17.0.1:6379 (mangwale_redis)
- MySQL: 103.160.107.41:3306 (production)
```

## 📦 Docker Compose Files

1. **docker-compose.production.yml** - Main production configuration
2. **docker-compose.override.yml** - Overrides for external services (Redis)
3. **docker-compose.yml** - Base configuration (for development)

## 🔧 Configuration Files

1. **.env.production** - Environment variables (create from template)
2. **Caddyfile** - Reverse proxy config (optional, currently disabled)
3. **nginx/search.conf** - Nginx config inside frontend container

## 🗂️ Key Directories

- `apps/search-api/` - NestJS API source code
- `apps/search-web/` - React frontend source code
- `scripts/` - Setup and indexing scripts
- `nginx/` - Nginx configuration
- `opensearch/` - OpenSearch configurations (if any)

## ✅ Deployment Checklist

- [ ] Server meets requirements (8GB RAM, 50GB disk, 4+ cores)
- [ ] Docker and Docker Compose installed
- [ ] System optimizations applied (vm.max_map_count=262144)
- [ ] Repository cloned
- [ ] `.env.production` created with correct credentials
- [ ] Docker images built successfully
- [ ] All services started and healthy
- [ ] OpenSearch indices created
- [ ] Health checks passing
- [ ] Search endpoints tested
- [ ] Frontend accessible

## 🔍 Verification Commands

```bash
# Check all services
docker-compose -f docker-compose.production.yml ps

# Health checks
curl http://localhost:3100/health
curl http://localhost:3101/health
curl http://localhost:9200/_cluster/health

# Test search
curl "http://localhost:3100/search?q=pizza&module=food"

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## 🐛 Common Issues

1. **OpenSearch won't start**: Fix `vm.max_map_count`
2. **Services can't connect**: Check Docker network
3. **API returns 500**: Check OpenSearch and Redis connections
4. **Frontend can't reach API**: Verify nginx proxy config

See `STAGING_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.

## 📞 Support

- Full Guide: `STAGING_DEPLOYMENT_GUIDE.md`
- Quick Reference: `DEPLOYMENT_QUICK_REFERENCE.md`
- Original Docs: `DEPLOYMENT.md`

## 🔄 Update Process

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Verify
curl http://localhost:3100/health
```

## 🔐 Security Notes

- ⚠️ Change all default passwords in `.env.production`
- ⚠️ Never commit `.env.production` to Git
- ⚠️ Configure firewall rules for production
- ⚠️ Use SSL/TLS for external access (Nginx reverse proxy)
- ⚠️ Enable OpenSearch security plugin if needed

---

**Last Updated**: $(date)
**Version**: 1.0.0
