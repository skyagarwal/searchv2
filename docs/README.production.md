# Mangwale Search System - Production Ready

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)

A complete, production-ready search system with full-text search, semantic search, real-time CDC, and analytics.

## 🚀 Quick Start

### Prerequisites
- Docker 24.0+
- Docker Compose 2.20+
- 8GB+ RAM
- 50GB+ disk space

### One-Command Deployment

```bash
git clone https://github.com/your-org/mangwale-search.git
cd mangwale-search
cp .env.example .env
# Edit .env and set your passwords
./deploy.sh deploy
```

That's it! The system will be available at:
- **Frontend**: http://localhost:8080
- **API**: http://localhost:3100
- **API Docs**: http://localhost:3100/docs

## 📦 What's Included

### Core Services
- **OpenSearch 2.13** - Full-text & vector search engine
- **MySQL 8.0** - Primary data source with CDC
- **Redis 7.2** - Caching layer
- **ClickHouse 24.3** - Analytics database
- **Redpanda** - Kafka-compatible streaming
- **Debezium** - MySQL CDC connector

### Application Services
- **Search API (NestJS)** - REST API backend
- **React Frontend (Vite)** - User interface
- **Embedding Service** - Semantic search with sentence-transformers
- **OpenSearch Dashboards** - Search analytics UI
- **Adminer** - MySQL admin interface

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │ :8080
│   (React)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  Search API │────▶│  OpenSearch  │ :9200
│  (NestJS)   │ :3100│              │
└──────┬──────┘     └──────────────┘
       │
       ├────────▶┌──────────────┐
       │         │    Redis     │ :6379
       │         └──────────────┘
       │
       ├────────▶┌──────────────┐
       │         │  ClickHouse  │ :8123
       │         └──────────────┘
       │
       └────────▶┌──────────────┐
                 │  Embedding   │ :3101
                 │   Service    │
                 └──────────────┘

       ┌─────────────┐    CDC    ┌──────────────┐
       │    MySQL    │───────────▶│  Redpanda    │
       │     :3306   │  Debezium  │    :9092     │
       └─────────────┘            └──────┬───────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │ Kafka Connect│ :8083
                                  └──────────────┘
```

## 🛠️ Deployment Options

### Option 1: Automated Script (Recommended)

```bash
# Interactive menu
./deploy.sh

# Or direct deployment
./deploy.sh deploy
```

### Option 2: Manual Deployment

```bash
# 1. Configure environment
cp .env.example .env
nano .env

# 2. Build images
docker-compose -f docker-compose.production.yml build

# 3. Start services
docker-compose -f docker-compose.production.yml up -d

# 4. Check health
docker-compose -f docker-compose.production.yml ps

# 5. Setup indices
docker exec search-api node /app/dist/scripts/opensearch-setup-food.js
docker exec search-api node /app/dist/scripts/opensearch-setup-ecom.js
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions.

## 📖 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[QUICK_START.md](QUICK_START.md)** - Quick reference guide
- **[API Documentation](http://localhost:3100/docs)** - Swagger/OpenAPI docs (after deployment)

## 🔧 Configuration

### Environment Variables

Key variables in `.env`:

```bash
# MySQL
MYSQL_DATABASE=mangwale
MYSQL_ROOT_PASSWORD=your_secure_password

# ClickHouse
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_clickhouse_password

# Optional: External MySQL for CDC
MYSQL_HOST=your-production-mysql-host
MYSQL_PORT=3306
```

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 8080 | React UI |
| Search API | 3100 | REST API |
| Embedding | 3101 | ML service |
| MySQL | 3306 | Database |
| Redis | 6379 | Cache |
| OpenSearch | 9200 | Search engine |
| Dashboards | 5601 | OpenSearch UI |
| Adminer | 8085 | MySQL UI |
| ClickHouse | 8123 | Analytics DB |
| Redpanda | 9092 | Kafka API |
| Kafka Connect | 8083 | CDC |

## 🧪 Testing

### Quick Health Check

```bash
# All services
./deploy.sh
# Select option 7 (Health Checks)

# Or manual check
curl http://localhost:3100/health
curl http://localhost:3101/health
curl http://localhost:9200/_cluster/health
```

### Search Test

```bash
# Text search
curl "http://localhost:3100/search?q=pizza&module=food"

# Semantic search
curl "http://localhost:3100/search?q=healthy%20meal&module=food&semantic=true"

# Suggestions
curl "http://localhost:3100/search/suggest?q=piz&module=food"
```

## 📊 Features

### Search Capabilities
- ✅ Full-text search with relevance scoring
- ✅ Semantic/vector search with embeddings
- ✅ Auto-suggestions and autocomplete
- ✅ Faceted search (categories, price, rating, etc.)
- ✅ Geo-location search and sorting
- ✅ Multi-module support (Food, E-commerce, Movies, etc.)

### Advanced Features
- ✅ Real-time CDC from MySQL to OpenSearch
- ✅ Redis caching for performance
- ✅ Analytics with ClickHouse
- ✅ Trending queries tracking
- ✅ Search personalization (optional)
- ✅ Health monitoring endpoints

## 🔐 Security

### Production Checklist

- [ ] Change all default passwords in `.env`
- [ ] Enable OpenSearch security plugin
- [ ] Configure firewall (allow only necessary ports)
- [ ] Use HTTPS with reverse proxy (Nginx/Traefik)
- [ ] Enable Redis authentication
- [ ] Set up automated backups
- [ ] Configure monitoring and alerts
- [ ] Regular security updates

See [DEPLOYMENT.md](DEPLOYMENT.md#security-hardening) for details.

## 💾 Backup & Recovery

### Create Backup

```bash
./deploy.sh
# Select option 10 (Create Backup)

# Or use automated script
./deploy.sh backup
```

Backups are stored in `/backups/mangwale-search/`

### Automated Backups

Add to crontab:
```bash
0 2 * * * /path/to/mangwale-search/deploy.sh backup
```

## 📈 Monitoring

### Health Endpoints

- Search API: `http://localhost:3100/health`
- Embedding: `http://localhost:3101/health`
- OpenSearch: `http://localhost:9200/_cluster/health`
- ClickHouse: `http://localhost:8123/ping`

### Logs

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f search-api

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 opensearch
```

### Metrics

```bash
# Container stats
docker stats

# OpenSearch stats
curl http://localhost:9200/_stats?pretty

# Disk usage
docker system df -v
```

## 🐛 Troubleshooting

### Common Issues

**OpenSearch won't start:**
```bash
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

**Services can't connect:**
```bash
docker network inspect search_search-network
docker-compose -f docker-compose.production.yml restart
```

**API returns 500 errors:**
```bash
docker logs search-api --tail=50
# Check if OpenSearch is ready
curl http://localhost:9200/_cluster/health
```

See [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting) for more.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

**Mangwale Search Team**
- Email: support@mangwale.ai
- GitHub: [@your-org](https://github.com/your-org)

## 🙏 Acknowledgments

- OpenSearch Project
- NestJS Framework
- React & Vite
- Sentence Transformers
- Debezium CDC

---

**Last Updated:** November 10, 2024  
**Version:** 1.0.0  
**Status:** Production Ready ✅
