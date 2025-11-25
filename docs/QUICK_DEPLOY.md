# Quick Deployment Guide

## Fastest Way to Deploy

```bash
# 1. Clone repository
cd /srv
git clone git@github.com:MangwaleDev/search-mangwale-ai.git SearchMangwaleAi
cd SearchMangwaleAi

# 2. Create environment file
cp .env.production.example .env.production
# Edit .env.production with your passwords

# 3. Deploy
chmod +x deploy.sh
./deploy.sh
```

## Verify Deployment

```bash
# Check all services
docker-compose -f docker-compose.production.yml ps

# Check API health
curl http://localhost:3100/health

# Check frontend
curl http://localhost:6000

# Check Caddy (after DNS is configured)
curl -I https://search.mangwale.ai
```

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.production.yml logs -f

# Restart service
docker-compose -f docker-compose.production.yml restart <service-name>

# Stop all
docker-compose -f docker-compose.production.yml down

# Start all
docker-compose -f docker-compose.production.yml up -d

# Rebuild and restart
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

## Service Ports

- **80, 443**: Caddy (public)
- **3100**: Search API (internal)
- **3101**: Embedding Service (internal)
- **6000**: Frontend (internal, proxied by Caddy)
- **9200**: OpenSearch (internal)
- **5601**: OpenSearch Dashboards (internal)
- **3306**: MySQL (internal)
- **6379**: Redis (internal)
- **8123**: ClickHouse (internal)
- **9092**: RedPanda/Kafka (internal)
- **8083**: Kafka Connect (internal)
- **8085**: Adminer (internal)

## DNS Setup

Make sure `search.mangwale.ai` points to your server IP:

```
Type: A
Name: search
Value: <your-server-ip>
TTL: 300
```

## Troubleshooting

**Caddy not starting?**
```bash
docker logs caddy
```

**Service unhealthy?**
```bash
docker-compose -f docker-compose.production.yml logs <service-name>
```

**Port conflict?**
```bash
sudo lsof -i :80
sudo lsof -i :443
```


