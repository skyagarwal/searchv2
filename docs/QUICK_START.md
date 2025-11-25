# Mangwale Search System - Quick Reference

## 🚀 Quick Start Commands

### Start All Services
```bash
cd /home/ubuntu/Devs/Search
docker-compose up -d
npm run start:api
```

### Check System Health
```bash
# All services health
curl http://localhost:3100/health
curl http://localhost:9200/_cluster/health
curl http://localhost:3101/health
```

### Test Search
```bash
# Food search
curl 'http://localhost:3100/search/food?q=pizza&size=5' | jq

# Ecommerce search
curl 'http://localhost:3100/search/ecom?q=oil&size=5' | jq

# Autocomplete
curl 'http://localhost:3100/search/food/suggest?q=bir' | jq
```

## 📊 Key Endpoints

| Endpoint | Description | Example |
|----------|-------------|---------|
| `/health` | System health check | `GET /health` |
| `/search/food` | Food item search | `GET /search/food?q=pizza&veg=true&size=10` |
| `/search/ecom` | Ecommerce search | `GET /search/ecom?q=oil&size=10` |
| `/search/food/suggest` | Autocomplete | `GET /search/food/suggest?q=bir` |
| `/search/food/stores` | Store search | `GET /search/food/stores?lat=19.9&lon=73.7&radius_km=5` |

## 🔧 Maintenance

### View Logs
```bash
# Search API logs
tail -f /home/ubuntu/Devs/Search/search-api.log

# OpenSearch logs
docker-compose logs -f opensearch

# Embedding service logs
docker-compose logs -f embedding-service
```

### Restart Services
```bash
# Restart Docker containers
docker-compose restart

# Restart Search API
pkill -f "node.*search-api"
npm run start:api
```

### Check Container Status
```bash
docker-compose ps
```

## 📈 System Status

- **Total Documents**: 13,195 (11,349 food + 1,846 ecom)
- **Vector Coverage**: 10,000+ items with 384-dim embeddings
- **Store Names**: 100% populated
- **All Features**: ✅ Working

## 🌐 Web Dashboards

- **OpenSearch Dashboards**: http://localhost:5601
- **Adminer (Database)**: http://localhost:8085
- **Search Frontend**: http://search.mangwale.ai

## 🔍 Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search query | `q=pizza` |
| `size` | number | Results per page | `size=20` |
| `from` | number | Pagination offset | `from=0` |
| `veg` | boolean | Vegetarian filter | `veg=true` |
| `category_id` | number | Category filter | `category_id=154` |
| `min_price` | number | Min price filter | `min_price=100` |
| `max_price` | number | Max price filter | `max_price=500` |
| `store_id` | number | Store filter | `store_id=15` |

## 🎯 Example Queries

### Basic Search
```bash
curl 'http://localhost:3100/search/food?q=biryani&size=10'
```

### With Filters
```bash
curl 'http://localhost:3100/search/food?q=pizza&veg=true&min_price=100&max_price=300&size=10'
```

### Category Filter
```bash
curl 'http://localhost:3100/search/food?q=paneer&category_id=288&size=10'
```

### Geospatial Search
```bash
curl 'http://localhost:3100/search/food/stores?lat=19.9975&lon=73.7898&radius_km=5'
```

## ⚠️ Troubleshooting

### OpenSearch Not Responding
```bash
docker-compose restart opensearch
# Wait 30-60 seconds
curl http://localhost:9200/_cluster/health
```

### Search API Returns 500
```bash
# Check if OpenSearch is up
curl http://localhost:9200/_cluster/health

# Restart Search API
pkill -f "node.*search-api"
npm run start:api
```

### No Search Results
```bash
# Check index counts
curl 'http://localhost:9200/_cat/indices?v' | grep items_v3

# Check if data exists
curl 'http://localhost:9200/food_items_v3/_count'
```

## 📝 Notes

- OpenSearch cluster status is **YELLOW** (expected for single-node setup)
- Search API runs on port **3100**
- OpenSearch runs on port **9200**
- Embedding service runs on port **3101**
- All Docker services are managed via `docker-compose.yml`

