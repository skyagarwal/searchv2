# 🔍 Search System Recovery Plan

**Date**: November 5, 2025  
**Status**: 🔴 **SEARCH NOT WORKING - DATA MISSING**

---

## 🚨 CRITICAL ISSUE IDENTIFIED

### Problem Summary:
Your OpenSearch indices are **completely empty** - no food, ecom, or any data exists!

```bash
# Current State (EMPTY):
curl 'http://localhost:9200/_cat/indices?v'
# Only system indices exist (.plugins-ml-config, .opensearch-observability)
# NO food_items, NO ecom_items, NO food_items_v2, NO ecom_items_v2
```

### What Happened:
According to your documentation (`IMPLEMENTATION_COMPLETE.md` from Oct 28, 2025):
- ✅ You HAD 10,526 food items indexed
- ✅ You HAD 1,011 ecom items indexed  
- ✅ Vector search was working
- ❌ **NOW: All indices are GONE**

**Possible Causes**:
1. OpenSearch container was recreated (volumes not persisted)
2. Manual deletion of indices
3. Docker volume was cleared
4. OpenSearch data corruption

---

## 📊 Current System Status

### ✅ Services Running:
| Service | Status | Port | Health |
|---------|--------|------|--------|
| OpenSearch | 🟢 Running | 9200 | Healthy (but empty) |
| Embedding Service | 🟡 Unhealthy | 3101 | Running but unhealthy |
| Gateway (Search API) | 🟢 Running | 3100 | Healthy |
| MySQL | 🟢 Running | 23306 | Healthy |
| Redis | 🟢 Running | 6379 | Healthy |
| ClickHouse | 🟢 Running | 8123 | Healthy |

### ❌ What's Broken:
1. **No OpenSearch Indices** - All food/ecom data missing
2. **Search API Returns Errors** - `index_not_found_exception: no such index [food_items]`
3. **AI Search Not Working** - Agent can't search without indices
4. **App Search Not Working** - Frontend search fails

---

## 🎯 Recovery Strategy

### Data Sources Available:

**Option 1: MySQL Database** (RECOMMENDED - If data exists)
- Check if you still have data in MySQL
- Use your existing sync scripts
- Fastest recovery path

**Option 2: Production SQL Dump** 
- File: `/home/ubuntu/Devs/Search/admin_prod (61) (1).sql`
- Contains 200 items (from your docs)
- Small dataset but working

**Option 3: New OSM Data Import**
- Download fresh OpenStreetMap data for India
- Index restaurants/shops from OSM
- More comprehensive but takes time

---

## 🚀 RECOVERY STEPS - OPTION 1: MySQL Sync (FASTEST - 10 minutes)

### Step 1: Verify MySQL Has Data (2 mins)

First, we need to find the correct MySQL credentials and verify data exists:

```bash
# Try to connect and check databases
docker exec mangwale_mysql mysql -u root -p<PASSWORD> -e "SHOW DATABASES;"

# Once connected, check for data:
docker exec mangwale_mysql mysql -u root -p<PASSWORD> -e "
  SELECT COUNT(*) as total_items FROM <DATABASE>.items;
  SELECT category, COUNT(*) as count FROM <DATABASE>.items GROUP BY category;
"
```

**TODO**: Find correct MySQL password and database name

### Step 2: Create OpenSearch Indices (3 mins)

```bash
cd /home/ubuntu/Devs/Search

# Create food items index
curl -X PUT "http://localhost:9200/food_items" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "veg": { "type": "boolean" },
      "store_id": { "type": "keyword" },
      "store_name": { "type": "text" },
      "store_location": { "type": "geo_point" },
      "image_url": { "type": "keyword" },
      "rating": { "type": "float" },
      "created_at": { "type": "date" },
      "name_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": { "ef_construction": 128, "m": 24 }
        }
      },
      "description_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": { "ef_construction": 128, "m": 24 }
        }
      },
      "combined_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": { "ef_construction": 128, "m": 24 }
        }
      }
    }
  }
}'

# Create ecom items index (similar structure)
curl -X PUT "http://localhost:9200/ecom_items" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "brand": { "type": "keyword" },
      "store_id": { "type": "keyword" },
      "store_name": { "type": "text" },
      "store_location": { "type": "geo_point" },
      "image_url": { "type": "keyword" },
      "rating": { "type": "float" },
      "stock": { "type": "integer" },
      "created_at": { "type": "date" },
      "name_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": { "ef_construction": 128, "m": 24 }
        }
      },
      "combined_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": { "ef_construction": 128, "m": 24 }
        }
      }
    }
  }
}'

# Verify indices created
curl 'http://localhost:9200/_cat/indices?v'
```

### Step 3: Sync Data from MySQL (5 mins)

```bash
cd /home/ubuntu/Devs/Search

# Run your existing sync script
python3 sync-mysql-complete.py

# OR use quick sync for smaller dataset
python3 quick-sync-mysql-to-opensearch.py
```

**Expected Output**:
```
✅ Connected to MySQL
✅ Connected to OpenSearch
📊 Found X items in MySQL
🔄 Syncing to OpenSearch...
✅ Indexed X food items
✅ Indexed X ecom items
🎉 Sync complete!
```

### Step 4: Generate Embeddings for Vector Search (Optional - 5 mins)

```bash
# Check if embedding service is healthy
curl http://localhost:3101/health

# If unhealthy, restart it
cd /home/ubuntu/Devs/Search
docker-compose restart embedding-service

# Wait 30 seconds for model to load
sleep 30

# Generate embeddings
python3 generate-embeddings.py

# This will add name_vector, description_vector, combined_vector to all items
```

### Step 5: Test Search (2 mins)

```bash
# Test keyword search (should work without embeddings)
curl "http://localhost:3100/search/food?q=biryani&lat=19.96&lon=73.76"

# Test vector search (needs embeddings)
curl "http://localhost:3100/search/food?q=healthy breakfast&lat=19.96&lon=73.76&semantic=true"

# Test from AI agent
# Open chat.mangwale.ai/chat
# Type: "show me biryani near me"
```

---

## 🚀 RECOVERY STEPS - OPTION 2: SQL Dump Import (IF NO MYSQL DATA)

### Step 1: Import SQL Dump (5 mins)

```bash
cd /home/ubuntu/Devs/Search

# Check SQL file size
ls -lh "admin_prod (61) (1).sql"

# Import to MySQL
docker exec -i mangwale_mysql mysql -u root -p<PASSWORD> < "admin_prod (61) (1).sql"

# OR create new database first
docker exec mangwale_mysql mysql -u root -p<PASSWORD> -e "CREATE DATABASE IF NOT EXISTS mangwale_search;"
docker exec -i mangwale_mysql mysql -u root -p<PASSWORD> mangwale_search < "admin_prod (61) (1).sql"
```

### Step 2: Follow Option 1 Steps 2-5 Above

---

## 🚀 RECOVERY STEPS - OPTION 3: Fresh OSM Data (COMPREHENSIVE - 1 hour)

### Step 1: Download India OSM Data

```bash
cd /home/ubuntu/Devs/Search/data
wget http://download.geofabrik.de/asia/india-latest.osm.pbf
```

### Step 2: Extract Restaurants & Shops

```bash
# Use osmium or osm2pgsql to extract POIs
# Filter for amenity=restaurant, shop=*, etc.
# Convert to JSON/CSV
```

### Step 3: Import to OpenSearch

```bash
# Bulk index the extracted data
# Add location coordinates as geo_point
```

**Note**: This is most comprehensive but takes longest

---

## 🔧 Quick Diagnostic Commands

```bash
# 1. Check OpenSearch health
curl 'http://localhost:9200/_cluster/health?pretty'

# 2. List all indices
curl 'http://localhost:9200/_cat/indices?v'

# 3. Check if MySQL has data
docker exec mangwale_mysql mysql -u root -p<PASSWORD> -e "SHOW DATABASES;"

# 4. Check embedding service
curl http://localhost:3101/health

# 5. Check search API
curl http://localhost:3100/health

# 6. Test gateway routing
pm2 logs mangwale-gateway --lines 20
```

---

## 📋 Post-Recovery Checklist

After data is restored:

- [ ] Verify indices exist: `curl 'http://localhost:9200/_cat/indices?v'`
- [ ] Check document count: `curl 'http://localhost:9200/food_items/_count'`
- [ ] Test keyword search: Works without embeddings
- [ ] Test vector search: Requires embeddings generated
- [ ] Test AI agent search: Try "show me biryani near me"
- [ ] Test frontend search: Visit app and search
- [ ] Generate embeddings: Run `python3 generate-embeddings.py`
- [ ] Setup persistent volumes: Prevent data loss again

---

## 🛡️ Prevent Future Data Loss

### Add OpenSearch Volume Persistence

Edit `/home/ubuntu/Devs/Search/docker-compose.yml`:

```yaml
opensearch:
  image: opensearchproject/opensearch:2.11.0
  volumes:
    - opensearch-data:/usr/share/opensearch/data  # ← Add this
  # ... rest of config

volumes:
  opensearch-data:  # ← Add this section
```

### Setup Automated Backups

```bash
# Create backup script
cat > /home/ubuntu/Devs/Search/backup-opensearch.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups/opensearch"
mkdir -p "$BACKUP_DIR"

# Backup all indices
curl -X PUT "http://localhost:9200/_snapshot/backup_repo" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/usr/share/opensearch/backups",
    "compress": true
  }
}'

curl -X PUT "http://localhost:9200/_snapshot/backup_repo/snapshot_$DATE?wait_for_completion=true"

echo "✅ Backup completed: snapshot_$DATE"
EOF

chmod +x /home/ubuntu/Devs/Search/backup-opensearch.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/Devs/Search/backup-opensearch.sh") | crontab -
```

---

## 🎯 IMMEDIATE ACTION REQUIRED

**Priority 1** (Next 5 minutes):
1. Find MySQL credentials
2. Check if data exists in MySQL
3. Determine which recovery option to use

**Priority 2** (Next 30 minutes):
1. Create OpenSearch indices
2. Import data (MySQL sync OR SQL dump)
3. Test basic keyword search

**Priority 3** (Next 1 hour):
1. Restart embedding service
2. Generate embeddings for vector search
3. Test AI agent integration
4. Test frontend search

---

## 📞 Need Help?

**Quick Health Check**:
```bash
cd /home/ubuntu/Devs/Search
bash -c '
echo "=== OpenSearch ==="
curl -s http://localhost:9200/_cat/indices?v
echo -e "\n=== Embedding Service ==="
curl -s http://localhost:3101/health
echo -e "\n=== Search API ==="
curl -s "http://localhost:3100/search/food?q=test" | head -20
'
```

**Get Full System Status**:
```bash
cd /home/ubuntu/Devs/Search
docker-compose ps
pm2 list | grep gateway
```

---

**Status**: 🔴 WAITING FOR USER ACTION
**Next Step**: Determine MySQL credentials and check if data exists
**ETA to Recovery**: 10-30 minutes (depending on data source)
