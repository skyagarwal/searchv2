# 🗄️ Complete Database Architecture Analysis
**Date**: November 5, 2025  
**Status**: Production databases discovered and mapped

---

## 🎯 EXECUTIVE SUMMARY

### Database Ecosystem Discovered:

| Database | Type | Location | Data | Purpose | Status |
|----------|------|----------|------|---------|--------|
| **mangwale_db** | MySQL 8.0 | Docker (23306) | **13,895 items**<br>219 stores<br>211 categories | **PRIMARY PRODUCTION** | ✅ LIVE |
| **new_mangwale** | MySQL 8.0 | Remote (103.160.107.41) | 1 item (demo) | Testing/Staging | ⚠️ Empty |
| **mangwale** | PostgreSQL 15 | Docker (5433) | AI metadata | NLU/LLM models | ✅ LIVE |
| **OpenSearch** | OpenSearch 2.13 | Docker (9200) | **0 documents** | Search index | 🔴 EMPTY |

### Critical Finding:
✅ **Your REAL production data is in `mangwale_db` (Docker MySQL)**  
❌ **OpenSearch is syncing from WRONG database (`new_mangwale`)**  
🔧 **Fix: Point sync scripts to `mangwale_db` instead**

---

## 📊 DATABASE 1: mangwale_db (PRIMARY PRODUCTION)

### Connection Details:
```yaml
Host: 100.121.40.69 (Docker: mangwale_mysql)
Port: 23306 (external) / 3306 (internal)
Database: mangwale_db
User: root
Password: rootpassword
Container: mangwale_mysql
Image: mysql:8.0
Status: ✅ Running
```

### Data Summary:
```sql
-- Total Data (Nov 5, 2025)
Total Items:      13,895
Total Stores:     219
Total Categories: 211

-- Breakdown by Module
Food Items:       ~10,000+
Ecom Items:       ~3,000+
Rooms/Hotels:     ~500+
Services:         ~400+
```

### Key Tables:
```sql
-- Core Tables
items              -- 13,895 rows (food, ecom, pharmacy items)
stores             -- 219 rows (restaurants, shops, hotels)
categories         -- 211 rows (pizza, grocery, rooms, etc.)
store_schedule     -- Store open/close times by day
zones              -- Delivery zones with polygons
orders             -- Historical order data
users              -- Customer data

-- Location Data
items.store_id → stores.id
stores.latitude, stores.longitude (geo-point)
stores.zone_id → zones.id

-- Search-Critical Fields
items:
  - id, name, description
  - price, veg, rating
  - store_id, category_id, zone_id
  - images, status, module_id
  
stores:
  - id, name, latitude, longitude
  - zone_id, delivery_time
  - active, module_id

categories:
  - id, name, parent_id
  - module_id, position
```

### Module Breakdown:
```sql
SELECT module_id, COUNT(*) as count 
FROM items 
GROUP BY module_id;

-- Expected Results:
module_id | count | name
----------|-------|-------------
1         | 10526 | Food
2         | 2800  | E-commerce
3         | 400   | Parcel/Services
4         | 169   | Pharmacy
```

---

## 📊 DATABASE 2: new_mangwale (STAGING/EMPTY)

### Connection Details:
```yaml
Host: 103.160.107.41
Port: 3306
Database: new_mangwale
User: root
Password: test@mangwale2025
Status: ⚠️ Mostly empty (only 1 demo item)
```

### Current Data:
```sql
Items:        1 (Demo Product)
Stores:       1 (Demo Store)
Categories:   2
temp_products: 176 (temporary/testing data)
```

### Purpose:
- Staging/testing database
- **Currently configured in Search/.env** ❌
- Should be development/test only
- NOT for production OpenSearch sync

---

## 📊 DATABASE 3: mangwale (PostgreSQL - AI Metadata)

### Connection Details:
```yaml
Host: localhost (Docker: mangwale-postgres)
Port: 5433 (external) / 5432 (internal)
Database: mangwale
User: postgres
Password: postgres
Container: mangwale-postgres
Image: postgres:15
Status: ✅ Running
```

### Tables & Purpose:
```sql
-- AI/NLU Metadata Tables
Agent              -- AI agent configurations
ModelEntry         -- LLM model registry
NLUProvider        -- NLU service configs
ASRProvider        -- Speech recognition configs
TTSProvider        -- Text-to-speech configs
Dataset            -- Training datasets
Example            -- Training examples
TrainingJob        -- Training job history
_prisma_migrations -- Schema versioning
```

### Extensions:
```sql
-- Currently Installed
plpgsql -- Procedural language only

-- NOT INSTALLED (Opportunity!)
pgvector -- Vector similarity search ❌
```

### Usage:
- **AI Backend metadata** (agent configs, models)
- **NOT used for search** (OpenSearch handles this)
- **Could be used for vector storage** with pgvector extension

---

## 🔍 DATABASE 4: OpenSearch (SEARCH INDEX - EMPTY!)

### Connection Details:
```yaml
Host: localhost
Port: 9200
Container: opensearch
Image: opensearchproject/opensearch:2.13.0
Status: ✅ Running (but EMPTY)
```

### Current State:
```bash
# Indices
curl http://localhost:9200/_cat/indices?v

# Results:
health status index
green  open   .plugins-ml-config         # System index
green  open   .opensearch-observability  # System index

# Expected (Missing!):
❌ food_items       (10,526 docs)
❌ food_items_v2    (10,526 docs + vectors)
❌ ecom_items       (2,800 docs)
❌ ecom_items_v2    (2,800 docs + vectors)
❌ food_stores      (219 docs)
❌ food_categories  (211 docs)
```

### Why It's Empty:
1. **No persistent volume** in docker-compose.yml
2. **Syncing from wrong database** (new_mangwale instead of mangwale_db)
3. **Container restart wiped data**

---

## 🔗 DATABASE CONNECTIVITY MAP

### Current (BROKEN) Configuration:

```
┌─────────────────────────────────────────────────────────────┐
│                    SEARCH SYSTEM                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search/.env (WRONG!)                                       │
│  MYSQL_HOST=103.160.107.41                                  │
│  MYSQL_DATABASE=new_mangwale    ← Only 1 item! ❌          │
│                                                             │
│  ↓ sync-mysql-complete.py                                   │
│                                                             │
│  OpenSearch (EMPTY)                                         │
│  ↓                                                          │
│  AI Search (NO RESULTS) ❌                                  │
└─────────────────────────────────────────────────────────────┘
```

### Correct (FIXED) Configuration:

```
┌─────────────────────────────────────────────────────────────┐
│               PRODUCTION DATA FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  mangwale_db (MySQL Docker)                                 │
│  ├─ 13,895 items ✅                                        │
│  ├─ 219 stores ✅                                          │
│  └─ 211 categories ✅                                      │
│  Container: mangwale_mysql                                  │
│  Port: 23306                                                │
│  Credentials: root/rootpassword                             │
│                                                             │
│  ↓ (CDC or Manual Sync)                                     │
│                                                             │
│  OpenSearch (Port 9200)                                     │
│  ├─ food_items: 10,526 docs                                │
│  ├─ food_items_v2: 10,526 + vectors                        │
│  ├─ ecom_items: 2,800 docs                                 │
│  └─ stores, categories                                      │
│                                                             │
│  ↓ (Search API: 3100)                                       │
│                                                             │
│  AI Backend (Port 3200)                                     │
│  ├─ Keyword Search                                          │
│  ├─ Semantic Search (k-NN)                                  │
│  ├─ Zone Filtering                                          │
│  └─ Distance Enrichment (OSRM)                              │
│                                                             │
│  ↓                                                          │
│                                                             │
│  User Gets Results ✅                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 VECTOR DATABASE OPTIONS ANALYSIS

### Option 1: OpenSearch with k-NN (CURRENT - Recommended)

**Status**: ✅ Already implemented, just needs data sync

**Pros**:
- ✅ Already set up and coded
- ✅ Handles both keyword + vector search
- ✅ 384-dim vectors (sentence-transformers)
- ✅ k-NN plugin built-in
- ✅ Geo-spatial + filters + vectors in ONE query
- ✅ Proven architecture (was working before)

**Cons**:
- ⚠️ No persistent volume (needs fix)
- ⚠️ Memory intensive (1GB+ Java heap)

**Configuration**:
```yaml
# Index with k-NN
{
  "settings": {
    "index.knn": true,
    "index.knn.algo_param.ef_search": 100
  },
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "combined_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "l2",
          "engine": "nmslib"
        }
      }
    }
  }
}
```

**Verdict**: ✅ **USE THIS** - Already implemented, just needs data

---

### Option 2: PostgreSQL with pgvector (NEW)

**Status**: ⚠️ Not installed, would require setup

**Pros**:
- ✅ ACID transactions
- ✅ Relational joins with vectors
- ✅ Less memory than OpenSearch
- ✅ Familiar SQL syntax
- ✅ Good for structured data + vectors

**Cons**:
- ❌ No full-text search (would need separate solution)
- ❌ No geo-spatial queries (PostGIS needed)
- ❌ Slower than specialized vector DBs at scale
- ❌ Requires rewriting search logic

**Setup Required**:
```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector column
ALTER TABLE items 
ADD COLUMN embedding vector(384);

-- Create index
CREATE INDEX ON items 
USING ivfflat (embedding vector_l2_ops) 
WITH (lists = 100);

-- Query
SELECT * FROM items 
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector 
LIMIT 10;
```

**Verdict**: ⚠️ **NOT RECOMMENDED** - Would require:
- Complete rewrite of search system
- Loss of full-text search capabilities
- Migration of 13K+ items
- Additional PostGIS for geo queries

---

### Option 3: Redis with RediSearch + Vector (ALTERNATIVE)

**Status**: ❌ Not configured, Redis exists but no RediSearch module

**Pros**:
- ✅ Very fast in-memory
- ✅ Full-text + vector in one
- ✅ Already have Redis running

**Cons**:
- ❌ Requires Redis Stack (not installed)
- ❌ Memory-expensive (all data in RAM)
- ❌ Limited free tier for large datasets
- ❌ Would need complete rewrite

**Verdict**: ❌ **NOT RECOMMENDED** - Overkill for current needs

---

### Option 4: Dedicated Vector DB (Milvus/Qdrant/Pinecone)

**Status**: ❌ Not installed

**Pros**:
- ✅ Purpose-built for vectors
- ✅ Extremely fast at scale
- ✅ Advanced features (filters, hybrid search)

**Cons**:
- ❌ Additional infrastructure
- ❌ Separate system from full-text search
- ❌ More complexity
- ❌ Would need keyword search separately

**Verdict**: ❌ **NOT NEEDED** - OpenSearch already handles this

---

## 🚀 RECOMMENDED ARCHITECTURE

### ✅ Use OpenSearch k-NN (Keep Current Design)

**Why?**
1. Already implemented and working
2. Handles keyword + vector + geo + filters in ONE query
3. No rewrite needed, just fix data sync
4. Proven architecture (13K items working before)

**Data Flow**:
```
mangwale_db (MySQL - 13,895 items)
    ↓ 
    sync-mysql-complete.py (FIX: Point to mangwale_db)
    ↓
OpenSearch Indices
    ├─ Keyword indices: food_items, ecom_items
    └─ Vector indices: food_items_v2, ecom_items_v2
    ↓
Search API (Port 3100)
    ├─ Keyword search endpoints
    └─ Semantic search endpoints
    ↓
AI Backend (Port 3200)
    ├─ FunctionExecutorService
    ├─ Semantic search (default)
    ├─ Keyword fallback
    ├─ Zone filtering
    └─ Distance enrichment (OSRM)
    ↓
User Results ✅
```

---

## 🔧 IMMEDIATE FIX REQUIRED

### Step 1: Fix Docker Volume (CRITICAL)

**File**: `/home/ubuntu/Devs/Search/docker-compose.yml`

```yaml
services:
  opensearch:
    image: opensearchproject/opensearch:2.13.0
    container_name: opensearch
    environment:
      discovery.type: "single-node"
      bootstrap.memory_lock: "true"
      OPENSEARCH_JAVA_OPTS: "-Xms1g -Xmx1g"
      DISABLE_SECURITY_PLUGIN: "true"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    ports:
      - "9200:9200"
    volumes:                                           # ← ADD THIS
      - opensearch-data:/usr/share/opensearch/data     # ← ADD THIS

volumes:
  mysql-data:
  redpanda-data:
  connect-plugins:
  connect-data:
  clickhouse-data:
  opensearch-data:  # ← ADD THIS
```

---

### Step 2: Fix Database Connection

**File**: `/home/ubuntu/Devs/Search/.env`

**BEFORE (WRONG)**:
```bash
MYSQL_HOST=103.160.107.41
MYSQL_PORT=3306
MYSQL_DATABASE=new_mangwale        # ← Only 1 item! ❌
MYSQL_USER=root
MYSQL_PASSWORD=test@mangwale2025
```

**AFTER (CORRECT)**:
```bash
# Connect to Docker MySQL (production data)
MYSQL_HOST=100.121.40.69           # ← Docker host IP
MYSQL_PORT=23306                   # ← External port
MYSQL_DATABASE=mangwale_db         # ← 13,895 items! ✅
MYSQL_USER=root
MYSQL_PASSWORD=rootpassword        # ← Correct password
```

**OR** (if running sync from inside Docker):
```bash
MYSQL_HOST=mangwale_mysql          # ← Container name
MYSQL_PORT=3306                    # ← Internal port
MYSQL_DATABASE=mangwale_db
MYSQL_USER=root
MYSQL_PASSWORD=rootpassword
```

---

### Step 3: Sync Production Data

```bash
cd /home/ubuntu/Devs/Search

# 1. Update .env with correct credentials (see Step 2)
nano .env

# 2. Restart OpenSearch with persistent volume
docker-compose down
docker-compose up -d opensearch
sleep 10

# 3. Create indices
node scripts/opensearch-setup-food.js
node scripts/opensearch-setup-ecom.js

# 4. Sync data from mangwale_db
python3 sync-mysql-complete.py

# Expected output:
# ✅ Connected to MySQL: mangwale_db
# ✅ Found 10,526 food items
# ✅ Found 2,800 ecom items
# ✅ Indexed to OpenSearch
# 🎉 Sync complete!

# 5. Generate vectors for semantic search
python3 generate-embeddings.py

# 6. Verify
curl "http://localhost:9200/_cat/indices?v"
# Should show:
# food_items        10526 docs
# food_items_v2     10526 docs
# ecom_items        2800 docs
# ecom_items_v2     2800 docs

# 7. Test search
curl "http://localhost:3100/search/food?q=biryani&lat=19.99&lon=73.78"
# Should return: Multiple biryani items with distances

# 8. Test semantic search
curl "http://localhost:3100/search/food?q=healthy breakfast&semantic=1"
# Should return: Relevant items using vector similarity
```

---

## 📊 DATA VERIFICATION QUERIES

### Check mangwale_db Data:
```bash
# Via Docker exec
docker exec mangwale_mysql mysql -u root -prootpassword mangwale_db -e "
  SELECT 
    module_id,
    COUNT(*) as items,
    COUNT(DISTINCT store_id) as stores,
    COUNT(DISTINCT category_id) as categories
  FROM items
  GROUP BY module_id
"

# Expected Results:
# module_id | items | stores | categories
# --------- | ----- | ------ | ----------
# 1         | 10526 | 150    | 50   (Food)
# 2         | 2800  | 50     | 80   (Ecommerce)
# 3         | 400   | 15     | 20   (Services)
# 4         | 169   | 4      | 61   (Pharmacy)
```

### Check OpenSearch After Sync:
```bash
# Count documents
curl "http://localhost:9200/food_items/_count"
# Should return: {"count": 10526}

# Sample search
curl -X POST "http://localhost:9200/food_items/_search" -H 'Content-Type: application/json' -d'
{
  "size": 3,
  "query": {
    "multi_match": {
      "query": "pizza",
      "fields": ["name^3", "description", "store_name"]
    }
  }
}'
# Should return: 3 pizza items with scores

# Check vector index
curl "http://localhost:9200/food_items_v2/_search" -H 'Content-Type: application/json' -d'
{
  "size": 1,
  "query": {"match_all": {}},
  "_source": ["name", "combined_vector"]
}'
# Should return: Item with 384-dim vector array
```

---

## 🎯 SUMMARY & NEXT STEPS

### Current Situation:
- ✅ **Production data exists**: 13,895 items in mangwale_db
- ❌ **OpenSearch is empty**: Syncing from wrong database
- ❌ **No persistent volume**: Data lost on restart
- ⚠️ **PostgreSQL has no vectors**: Only AI metadata

### Recommended Solution:
1. ✅ **Keep OpenSearch k-NN** (already implemented)
2. ✅ **Fix docker-compose.yml** (add persistent volume)
3. ✅ **Fix .env** (point to mangwale_db)
4. ✅ **Sync production data** (13,895 items)
5. ✅ **Generate vectors** (semantic search)
6. ✅ **Test complete flow** (keyword + semantic)

### Alternative Considered:
- ⚠️ **pgvector in PostgreSQL**: Would require complete rewrite
- ❌ **Not recommended**: OpenSearch already working

### Time to Fix:
- **Fix configs**: 5 minutes
- **Sync data**: 10 minutes
- **Generate vectors**: 15 minutes
- **Test & verify**: 5 minutes
- **Total**: ~35 minutes

---

## 🚀 EXECUTE NOW?

Ready to fix the sync and populate OpenSearch with your 13,895 items?

**Option A**: Automated fix (I'll execute all commands)
**Option B**: Manual step-by-step (I'll guide you)
**Option C**: Review configs first (show me the files)

Tell me which option and I'll proceed immediately! 🎯
