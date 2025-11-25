# Deployment Status - search.mangwale.ai

## ✅ Successfully Deployed Services

All core services are now running:

| Service | Status | Port | Access |
|---------|--------|------|--------|
| **search-api** | ✅ Healthy | 3100 | http://localhost:3100 |
| **search-frontend** | ✅ Running | 6000 | http://localhost:6000 |
| **caddy** | ✅ Running | 8888/9443 | http://localhost:8888 |
| **opensearch** | ✅ Healthy | 9200 | http://localhost:9200 |
| **redis** | ✅ Healthy | 6379 | localhost:6379 |
| **clickhouse** | ✅ Healthy | 8123 | http://localhost:8123 |
| **redpanda** | ✅ Healthy | 9092 | localhost:9092 |
| **kafka-connect** | ✅ Healthy | 8083 | http://localhost:8083 |
| **embedding-service** | ✅ Healthy | 3101 | http://localhost:3101 |
| **opensearch-dashboards** | ✅ Running | 5601 | http://localhost:5601 |
| **adminer** | ✅ Running | 8085 | http://localhost:8085 |

## 🔧 Configuration

### Environment
- **MySQL**: External server at `103.160.107.41:3306`
- **Database**: `one_mangwale`
- **All other services**: Running in Docker containers

### Ports
- **Caddy**: HTTP on 8888, HTTPS on 9443 (non-standard ports to avoid conflict with nginx)
- **Frontend**: 6000
- **API**: 3100

## 🌐 Access Points

### Direct Access (Internal)
- Frontend: http://localhost:6000
- API: http://localhost:3100
- API Docs: http://localhost:3100/api-docs
- Health: http://localhost:3100/health
- Caddy: http://localhost:8888

### Through Caddy (Port 8888)
- http://localhost:8888 (will proxy to frontend/API based on path)

## 📝 Next Steps

### 1. Configure Nginx to Proxy to Caddy

Since Caddy is running on non-standard ports (8888/9443), you have two options:

**Option A: Proxy nginx → Caddy (Recommended)**
```bash
# Copy nginx config
sudo cp /srv/SearchMangwaleAi/nginx/search.mangwale.ai.conf /etc/nginx/sites-available/search.mangwale.ai

# Enable site
sudo ln -s /etc/nginx/sites-available/search.mangwale.ai /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

**Option B: Configure nginx to proxy directly to services**
- Edit `/srv/SearchMangwaleAi/nginx/search.mangwale.ai.conf`
- Uncomment the "Direct proxy" section
- Configure SSL certificates

### 2. DNS Configuration

Ensure DNS is configured:
```
Type: A
Name: search
Domain: mangwale.ai
Value: <your-server-ip>
TTL: 300
```

### 3. SSL Certificate

**If using nginx:**
```bash
sudo certbot --nginx -d search.mangwale.ai
```

**If using Caddy directly (requires port 80/443):**
- Stop nginx temporarily
- Change Caddy ports back to 80/443
- Caddy will automatically obtain SSL certificate

## 🔍 Testing

```bash
# Test API
curl http://localhost:3100/health

# Test Frontend
curl http://localhost:6000

# Test Caddy
curl http://localhost:8888

# Test through nginx (after configuration)
curl http://search.mangwale.ai/health
```

## 📊 Service Management

```bash
# View all services
cd /srv/SearchMangwaleAi
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart a service
docker-compose -f docker-compose.production.yml restart search-api

# Stop all
docker-compose -f docker-compose.production.yml down

# Start all
docker-compose -f docker-compose.production.yml up -d
```

## ⚠️ Notes

1. **MySQL Container**: The local MySQL container is commented out since you're using external MySQL at `103.160.107.41`
2. **Caddy Ports**: Changed to 8888/9443 to avoid conflict with nginx on port 80
3. **SSL**: Configure SSL certificates in nginx or change Caddy back to ports 80/443 (requires stopping nginx)

## ✅ Deployment Complete!

All services are deployed and running. Configure nginx to proxy to Caddy or directly to services, set up DNS, and obtain SSL certificates to complete the production setup.


