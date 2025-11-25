# Pre-Deployment Checklist

## ✅ Before Pushing to Git

### 1. Files Created ✓
- [x] `Dockerfile.api` - NestJS Search API container
- [x] `Dockerfile.frontend` - React frontend container
- [x] `Dockerfile.embedding` - Embedding service (already exists)
- [x] `docker-compose.production.yml` - Production orchestration
- [x] `DEPLOYMENT.md` - Complete deployment guide
- [x] `deploy.sh` - Automated deployment script
- [x] `README.production.md` - Production README
- [x] `.gitignore` - Updated with comprehensive exclusions
- [x] `.env.example` - Environment template (already exists)

### 2. Security Check ✓
- [x] `.env` file is in `.gitignore`
- [x] No passwords in code
- [x] No API keys committed
- [x] SQL dumps excluded from Git
- [x] Backup directories excluded
- [x] Log files excluded

### 3. Code Quality ✓
- [x] All services have health checks
- [x] Docker images use multi-stage builds
- [x] Non-root users in containers
- [x] Proper volume mounts
- [x] Network isolation configured
- [x] Resource limits set

### 4. Documentation ✓
- [x] Complete deployment guide
- [x] System requirements documented
- [x] Configuration explained
- [x] Troubleshooting section
- [x] Backup procedures documented
- [x] Security hardening guide

## 📋 Deployment on New Server

### Step 1: Clone Repository
```bash
git clone <your-repo-url>
cd mangwale-search
```

### Step 2: Configure
```bash
cp .env.example .env
nano .env  # Set passwords and configuration
```

### Step 3: Deploy
```bash
chmod +x deploy.sh
./deploy.sh deploy
```

### Step 4: Import Data
```bash
# Import MySQL dump
docker exec -i mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} mangwale < your-data.sql

# Index to OpenSearch
docker exec search-api npm run db:index:mysql -- \
  --table menu_items \
  --id id \
  --fields id,name,description,category,price,rating \
  --index-alias food_items
```

### Step 5: Verify
```bash
curl http://localhost:3100/health
curl http://localhost:8080
curl "http://localhost:3100/search?q=test&module=food"
```

## 🔍 What Gets Deployed

### Infrastructure (9 containers)
1. **OpenSearch** - Search engine
2. **OpenSearch Dashboards** - UI for OpenSearch
3. **MySQL** - Source database
4. **Redis** - Cache
5. **ClickHouse** - Analytics
6. **Redpanda** - Kafka-compatible streaming
7. **Kafka Connect** - CDC connector
8. **Adminer** - MySQL UI
9. **Embedding Service** - ML model

### Application (2 containers)
10. **Search API** - NestJS backend
11. **Frontend** - React/Vite UI

### Total: 11 Docker containers

## 🎯 Minimum Server Requirements

- **CPU**: 4 cores
- **RAM**: 8 GB (16 GB recommended)
- **Disk**: 50 GB SSD
- **OS**: Ubuntu 20.04+, Debian 11+, or CentOS 8+
- **Docker**: 24.0+
- **Docker Compose**: 2.20+

## 🚀 Performance Tuning

### For 16GB RAM Server
Edit `docker-compose.production.yml`:

```yaml
opensearch:
  environment:
    OPENSEARCH_JAVA_OPTS: "-Xms8g -Xmx8g"  # Increase from 2g

redpanda:
  command:
    - --memory=4G  # Increase from 2G
```

### For Production Traffic
Enable reranking and personalization in Search API:
```yaml
search-api:
  environment:
    - ENABLE_RERANKER=true
    - ENABLE_PERSONALIZATION=true
```

## 📦 What's NOT Included in Git

The following are excluded via `.gitignore`:
- `node_modules/` - NPM packages
- `dist/` - Build outputs
- `.env` - Environment secrets
- `data/` - Data directories
- `backups/` - Backup files
- `*.sql` - Database dumps
- `*.log` - Log files
- `venv/` - Python virtual env

These will be created during deployment:
- Docker volumes (managed by Docker)
- Built assets (created during `docker build`)
- Indices (created during setup)

## 🔐 Security Notes

### Before Going to Production

1. **Change ALL default passwords** in `.env`:
   - MYSQL_ROOT_PASSWORD
   - CLICKHOUSE_PASSWORD
   - Add REDIS_PASSWORD

2. **Set up firewall**:
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```

3. **Use HTTPS** - Add Traefik/Nginx reverse proxy:
   - Automatic SSL with Let's Encrypt
   - Rate limiting
   - Security headers

4. **Enable OpenSearch Security** (optional):
   - Remove `DISABLE_SECURITY_PLUGIN: "true"`
   - Configure TLS
   - Set up users and roles

5. **Restrict MySQL**:
   - Don't expose port 3306 externally
   - Use internal Docker network only

## ✅ Final Verification

Before pushing to Git, verify:

```bash
# Check no sensitive data
git status
git diff

# Ensure .env is not tracked
git ls-files | grep .env
# Should NOT show .env (only .env.example)

# Check file sizes
find . -type f -size +10M
# Large files should be in .gitignore
```

## 🎉 You're Ready!

Once verified, commit and push:

```bash
git add .
git commit -m "Production-ready deployment with Docker Compose"
git push origin main
```

Then deploy on your server:

```bash
# On production server
git clone <your-repo>
cd mangwale-search
cp .env.example .env
nano .env  # Configure
./deploy.sh deploy
```

---

**Created:** November 10, 2024  
**Status:** Ready for Deployment ✅
