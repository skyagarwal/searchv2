# 🏗️ Complete Search Architecture Analysis
**Date**: November 5, 2025  
**Status**: System WAS working - Now indices are empty

---

## 🎯 VERIFIED ARCHITECTURE (From Your Code)

### Complete Data Flow (As Designed & Built)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                │
│              "show me biryani near me"                              │
│              Session: { location: {lat, lon} }                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 MANGWALE AI (NestJS - Port 3200)                    │
│                 /home/ubuntu/Devs/mangwale-ai                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ FunctionExecutorService                                    │   │
│  │ File: src/agents/services/function-executor.service.ts     │   │
│  │                                                             │   │
│  │ STEP 1: Zone Detection                                     │   │
│  │  ├─ ZoneService.getZoneIdByCoordinates(lat, lon)          │   │
│  │  ├─ Calls: PHP_API_BASE_URL/api/v1/config/get-zone-id     │   │
│  │  └─ Returns: { zone_id: 4, zone_name: "Nashik New" }      │   │
│  │                                                             │   │
│  │ STEP 2A: Semantic Search (useSemantic=true, default)      │   │
│  │  ├─ Get embedding: EMBEDDING_SERVICE_URL/embed (3101)      │   │
│  │  ├─ Query vector index: OPENSEARCH_URL/food_items_v2      │   │
│  │  ├─ k-NN search with zone_id filter                        │   │
│  │  └─ Returns: Items with similarity scores                  │   │
│  │                                                             │   │
│  │ STEP 2B: Keyword Search (fallback or semantic=false)      │   │
│  │  ├─ Call: SEARCH_API_URL/search/food?q=biryani (3100)     │   │
│  │  └─ Returns: Items from OpenSearch keyword index           │   │
│  │                                                             │   │
│  │ STEP 3: Distance & Delivery Time Enrichment               │   │
│  │  ├─ OSRMService.enrichWithDistance(items, userLocation)    │   │
│  │  ├─ OSRM bulk distance calculation (localhost:5000)        │   │
│  │  ├─ StoreScheduleService.isStoreOpen(store_id)            │   │
│  │  ├─ MySQL query: store_schedule table                      │   │
│  │  └─ Calculate: travel_time + (prep_time × 1.10)           │   │
│  │                                                             │   │
│  │ STEP 4: Sort & Return                                      │   │
│  │  ├─ Sort by distance (closest first)                       │   │
│  │  ├─ Add zone info to response                              │   │
│  │  └─ Return enriched results to user                        │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ├──────────────────┬────────────────────┬─────────────────┐
                     ▼                  ▼                    ▼                 ▼
        ┌─────────────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
        │   PHP Backend       │  │ Search API   │  │ OpenSearch  │  │ Embedding    │
        │   (Laravel)         │  │ (NestJS)     │  │ 2.13.0      │  │ Service      │
        │ testing.mangwale.   │  │ Port 3100    │  │ Port 9200   │  │ Port 3101    │
        │   com               │  │              │  │             │  │              │
        │                     │  │ Features:    │  │ Indices:    │  │ Model:       │
        │ Zone Detection:     │  │ • Keyword    │  │ • food_v2   │  │ sentence-    │
        │ • get-zone-id API   │  │ • Geo search │  │ • ecom_v2   │  │ transformers │
        │ • Point-in-polygon  │  │ • Facets     │  │ • rooms_v2  │  │              │
        │ • 30min cache       │  │ • Suggest    │  │ • services  │  │ Vector:      │
        │                     │  │              │  │             │  │ 384 dims     │
        └─────────────────────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘
                                        │                  │                 │
                                        └──────────────────┴─────────────────┘
                                                           │
                                                           ▼
                           ┌───────────────────────────────────────────────┐
                           │          DATA SOURCES                         │
                           │                                               │
                           │  MySQL (new_mangwale - 103.160.107.41:3306)  │
                           │  ├─ items, stores, categories                │
                           │  ├─ store_schedule (open/close times)        │
                           │  ├─ zones (delivery areas)                   │
                           │  └─ orders (historical data)                 │
                           │                                               │
                           │  PostgreSQL (mangwale - localhost:5433)      │
                           │  └─ AI backend metadata                      │
                           │                                               │
                           │  OSRM (localhost:5000)                       │
                           │  └─ India OSM data (Oct 25, 2025)            │
                           └───────────────────────────────────────────────┘
```

---

## 📊 DISCOVERED CONFIGURATION

### 1. AI Backend (mangwale-ai)
**Location**: `/home/ubuntu/Devs/mangwale-ai/`  
**Port**: 3200  
**Process**: PM2 (mangwale-ai, id: 5)  
**Status**: ✅ Running (105.5mb)

**Environment** (`.env`):
```bash
# Core
PORT=3200
NODE_ENV=production
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/mangwale

# External Services
PHP_API_BASE_URL=https://testing.mangwale.com
SEARCH_API_URL=http://localhost:3100          # ← OpenSearch Search API
OPENSEARCH_URL=http://localhost:9200           # ← Direct OpenSearch access
EMBEDDING_SERVICE_URL=http://localhost:3101    # ← Vector embeddings

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
```

**Key Files**:
- `src/agents/services/function-executor.service.ts` (763 lines)
  - Line 74-340: `search_products` function
  - Semantic search implementation (k-NN)
  - Keyword search fallback
  - Zone filtering
  - Distance enrichment

- `src/routing/services/osrm.service.ts`
  - Distance calculation
  - Delivery time estimation
  - Store schedule checking

- `src/zones/services/zone.service.ts`
  - Zone detection via PHP API
  - Caching with Redis

---

### 2. Search API (NestJS)
**Location**: `/home/ubuntu/Devs/Search/apps/search-api/`  
**Port**: 3100  
**Process**: PM2 (mangwale-gateway, id: 0)  
**Status**: ✅ Running (69.2mb)

**Environment** (`/home/ubuntu/Devs/Search/.env`):
```bash
# OpenSearch
OPENSEARCH_HOST=http://localhost:9200
OPENSEARCH_USERNAME=
OPENSEARCH_PASSWORD=

# MySQL (Read-only for data sync)
MYSQL_HOST=103.160.107.41
MYSQL_PORT=3306
MYSQL_DATABASE=new_mangwale
MYSQL_USER=root
MYSQL_PASSWORD=test@mangwale2025

# Search API
PORT=3100
NODE_ENV=development
ENABLE_PERSONALIZATION=true
ENABLE_RERANKER=false
```

**Endpoints**:
- `GET /search/food?q=pizza&lat=19.99&lon=73.78&veg=1`
- `GET /search/ecom?q=milk&brand=amul`
- `GET /search/food/suggest?q=pi`
- `GET /search/agent?q=veg pizza near me`

**Key Files**:
- `apps/search-api/src/search/search.service.ts` (~2000 lines)
  - OpenSearch query builder
  - Geo-distance search
  - Faceted search
  - Suggestions

---

### 3. OpenSearch
**Container**: `opensearch`  
**Image**: `opensearchproject/opensearch:2.13.0`  
**Port**: 9200  
**Status**: ✅ Running  
**Health**: 🔴 **EMPTY - NO INDICES**

**Expected Indices** (from your docs):
```
✅ BEFORE (Oct 28, 2025):
- food_items         → 10,526 documents
- food_items_v2      → 10,526 with vectors
- ecom_items         → 1,011 documents
- ecom_items_v2      → 1,011 with vectors
- food_stores        → Stores data
- food_categories    → Categories

❌ NOW (Nov 5, 2025):
- NO indices found (only system indices)
```

**Index Mapping** (food_items_v2):
```json
{
  "mappings": {
    "properties": {
      "id": "long",
      "name": "text + keyword",
      "description": "text",
      "price": "float",
      "veg": "boolean",
      "store_id": "long",
      "store_name": "text + keyword",
      "store_location": "geo_point",
      "store_latitude": "float",
      "store_longitude": "float",
      "zone_id": "long",
      "category_id": "long",
      "category_name": "text + keyword",
      "avg_rating": "float",
      "delivery_time": "text",
      "name_vector": "knn_vector[384]",
      "description_vector": "knn_vector[384]",
      "combined_vector": "knn_vector[384]"
    }
  }
}
```

---

### 4. Embedding Service
**Container**: `embedding-service`  
**Port**: 3101  
**Status**: 🟡 Unhealthy (but running)  
**Model**: `sentence-transformers/all-MiniLM-L6-v2`  
**Dimensions**: 384

**Endpoint**:
```bash
POST http://localhost:3101/embed
{
  "texts": ["veg biryani", "pizza margherita"]
}

Response:
{
  "embeddings": [[0.123, 0.456, ...], [0.789, 0.012, ...]]
}
```

---

### 5. PHP Backend (Laravel - Read-Only)
**URL**: `https://testing.mangwale.com`  
**Purpose**: Zone detection, user data, order processing  
**MySQL**: Same as Search API (103.160.107.41:3306)

**APIs Used by AI**:
- `/api/v1/config/get-zone-id?lat={lat}&lng={lng}`
- Store data (read-only)
- User authentication

---

### 6. Data Sync Architecture (CDC)

**Original Design** (from your docs):
```
MySQL (new_mangwale)
    ↓ (Debezium CDC)
Kafka/Redpanda (Port 9092)
    ↓ (Kafka Connect)
OpenSearch (Port 9200)
```

**Sync Scripts**:
- `sync-mysql-complete.py` - Full sync from MySQL → OpenSearch
- `quick-sync-mysql-to-opensearch.py` - Quick sync for testing
- `generate-embeddings.py` - Add vectors to documents
- `scripts/cdc-to-opensearch.js` - Real-time CDC

---

## 🔍 WHAT HAPPENED? (Root Cause Analysis)

### Evidence Timeline:

**October 28, 2025** - From `ARCHITECTURE_UPDATED_WITH_OPENSEARCH.md`:
```
✅ OpenSearch: GREEN status, 65+ shards
✅ Food items: 10,526 indexed
✅ Ecom items: 1,011 indexed
✅ Vector search: Working
✅ Semantic search: Operational
```

**October 29, 2025** - From `END_TO_END_TEST_COMPLETE.md`:
```
✅ Test 1: OpenSearch returns 3 biryani items
✅ Test 2: Search API with distance working
✅ Test 5: Agent end-to-end operational (433ms)
```

**November 5, 2025** - NOW:
```
❌ OpenSearch: No indices
❌ Search: index_not_found_exception
❌ AI search: Returning no results
```

### Possible Causes:

1. **Docker Volume Loss** (Most Likely)
   - OpenSearch container recreated without persistent volume
   - Data stored in container, not volume
   - `docker-compose down -v` or similar wiped data

2. **Manual Index Deletion**
   - Someone ran: `curl -X DELETE "http://localhost:9200/food_*"`
   - Accident or testing gone wrong

3. **OpenSearch Corruption**
   - Index corruption requiring deletion
   - Cluster state issues

4. **Container Restart Without Volumes**
   ```yaml
   # Missing in docker-compose.yml:
   services:
     opensearch:
       volumes:
         - opensearch-data:/usr/share/opensearch/data  # ← NOT PRESENT!
   ```

### CONFIRMED: Docker Compose Volume Missing!

Looking at your `docker-compose.yml`:
```yaml
services:
  opensearch:
    image: opensearchproject/opensearch:2.13.0
    ports:
      - "9200:9200"
    # ❌ NO VOLUMES DEFINED!
    # Every restart = empty OpenSearch
```

**This is the root cause!** OpenSearch data is stored INSIDE the container, not a persistent volume. Any container restart wipes all data.

---

## 🚀 RECOVERY PLAN

### Phase 1: Add Persistent Volume (CRITICAL - Do First)

**Edit `/home/ubuntu/Devs/Search/docker-compose.yml`**:

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
    volumes:                                    # ← ADD THIS
      - opensearch-data:/usr/share/opensearch/data  # ← ADD THIS

# At bottom of file:
volumes:
  mysql-data:
  redpanda-data:
  connect-plugins:
  connect-data:
  clickhouse-data:
  opensearch-data:  # ← ADD THIS
```

### Phase 2: Recreate Indices (5 minutes)

**Option A: From MySQL (if data still exists)**:

```bash
cd /home/ubuntu/Devs/Search

# 1. Restart OpenSearch with volume
docker-compose down
docker-compose up -d opensearch

# 2. Wait for OpenSearch to start
sleep 10

# 3. Create indices
node scripts/opensearch-setup-food.js
node scripts/opensearch-setup-ecom.js

# 4. Sync data from MySQL
python3 sync-mysql-complete.py

# 5. Generate vectors
python3 generate-embeddings.py
```

**Option B: From SQL Dump (if MySQL is also empty)**:

```bash
# 1. Import SQL dump
mysql -h 103.160.107.41 -u root -p'test@mangwale2025' new_mangwale < "admin_prod (61) (1).sql"

# 2. Follow Option A steps 2-5
```

### Phase 3: Verify Everything (2 minutes)

```bash
# 1. Check indices exist
curl "http://localhost:9200/_cat/indices?v"
# Should show: food_items, food_items_v2, ecom_items, ecom_items_v2

# 2. Check document count
curl "http://localhost:9200/food_items/_count"
# Should return: {"count": 10526}

# 3. Test keyword search
curl "http://localhost:3100/search/food?q=biryani&size=3"
# Should return: 3 items

# 4. Test semantic search
curl "http://localhost:3100/search/food?q=healthy breakfast&semantic=1&size=3"
# Should return: 3 relevant items

# 5. Test from AI chat
# Open: https://chat.mangwale.ai/chat
# Type: "show me pizza near me"
# Should: Return results with distances
```

### Phase 4: Set Up CDC (Optional - Real-time sync)

```bash
# Register MySQL → Kafka connector
cd /home/ubuntu/Devs/Search
./scripts/register-connector.sh

# Start CDC consumer
node scripts/cdc-to-opensearch.js
```

---

## 📋 COMPLETE CONNECTION MAP

### Service Dependencies:

```
User
  ↓
AI Backend (3200)
  ├─→ PHP API (testing.mangwale.com) - Zone detection
  ├─→ Search API (3100) - Keyword search
  ├─→ OpenSearch (9200) - Direct semantic search
  ├─→ Embedding Service (3101) - Vector generation
  ├─→ OSRM (5000) - Distance calculation
  ├─→ MySQL (5433) - Store schedule
  └─→ Redis (6379) - Session & caching

Search API (3100)
  └─→ OpenSearch (9200) - All searches

OpenSearch (9200)
  ├─ Data synced from MySQL (103.160.107.41:3306)
  └─ Vectors from Embedding Service (3101)

MySQL (103.160.107.41:3306)
  └─ Master database (read by Search API for sync)
```

### Data Flow for "show me biryani":

```
1. User → AI Backend (3200)
   POST /chat/message
   { message: "show me biryani", location: {lat, lon} }

2. AI Backend → PHP API (Zone Detection)
   GET https://testing.mangwale.com/api/v1/config/get-zone-id?lat=19.99&lng=73.78
   Response: { zone_id: 4, zone_name: "Nashik New" }

3. AI Backend → Embedding Service (if semantic=true)
   POST http://localhost:3101/embed
   { texts: ["biryani"] }
   Response: { embeddings: [[0.123, ...]] }

4. AI Backend → OpenSearch (Semantic Search)
   POST http://localhost:9200/food_items_v2/_search
   {
     query: {
       bool: {
         must: [{ knn: { combined_vector: { vector: [0.123, ...], k: 100 } } }],
         filter: [{ term: { zone_id: 4 } }]
       }
     }
   }
   Response: 10 items with similarity scores

5. AI Backend → OSRM (Distance Enrichment)
   GET http://localhost:5000/table/v1/driving/{coords}
   Response: Distances and travel times

6. AI Backend → MySQL (Store Schedule)
   SELECT * FROM store_schedule WHERE store_id IN (3, 9, 13) AND day = 3
   Response: Open/close times

7. AI Backend → User
   Returns: 10 enriched items with:
   - Similarity scores
   - Distances (km)
   - Delivery times (calculated)
   - Store status (open/closed)
   - Zone info (deliverable)
```

---

## 🎯 IMMEDIATE ACTION REQUIRED

**Priority 1: Fix Docker Volume** (NOW - 5 minutes)
```bash
cd /home/ubuntu/Devs/Search

# Add volume to docker-compose.yml (see Phase 1 above)
nano docker-compose.yml

# Recreate container with volume
docker-compose down
docker-compose up -d opensearch
```

**Priority 2: Restore Data** (10 minutes)
```bash
# Check if MySQL still has data
mysql -h 103.160.107.41 -u root -p'test@mangwale2025' new_mangwale -e "SELECT COUNT(*) FROM items"

# If data exists, sync it
python3 sync-mysql-complete.py
python3 generate-embeddings.py

# If no data, import SQL dump first
mysql -h 103.160.107.41 -u root -p'test@mangwale2025' new_mangwale < "admin_prod (61) (1).sql"
```

**Priority 3: Verify** (2 minutes)
```bash
# Test everything works
curl "http://localhost:9200/_cat/indices?v"
curl "http://localhost:3100/search/food?q=pizza"
# Test AI chat at chat.mangwale.ai
```

---

## 📝 SUMMARY

### What You HAD (Working System):
- ✅ Complete semantic search with 384-dim vectors
- ✅ Zone-based filtering (hyperlocal delivery)
- ✅ OSRM distance & delivery time calculation
- ✅ Store schedule checking (open/closed)
- ✅ Keyword + semantic search fallback
- ✅ 10,526 food items, 1,011 ecom items indexed

### What Happened:
- ❌ OpenSearch container restarted
- ❌ No persistent volume configured
- ❌ All indices and data lost

### Fix Required:
1. Add `opensearch-data` volume to docker-compose.yml
2. Sync data from MySQL (if exists) or SQL dump
3. Generate embeddings for semantic search
4. Test complete flow

### Time to Fix: **~20 minutes total**

---

**Ready to execute the fix? Tell me which option:**
- **Option A**: MySQL has data (just resync)
- **Option B**: Need to import SQL dump first
- **Option C**: Create sample data for testing

I'll execute immediately! 🚀
