# 🔍 Database Indexing Workflow & Optimization Guide

**Date**: November 20, 2025  
**Status**: ✅ Deployed to search.mangwale.ai  
**Database**: `migrated_db` (updated from `one_mangwale`)

---

## 📊 How Indexing Works in This System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    INDEXING ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────┘

MySQL (migrated_db)                    OpenSearch
├─ items (13,194+ items)      ──sync──>  ├─ food_items
├─ stores (133+ stores)        ──sync──>  ├─ food_stores  
├─ categories (193+ categories) ──sync──>  ├─ food_categories
├─ orders                      ──sync──>  ├─ ecom_items
├─ order_details               ──sync──>  ├─ ecom_stores
└─ reviews                     ──sync──>  └─ ecom_categories
```

---

## 🔄 Indexing Process (Step-by-Step)

### 1. **Initial Data Sync** (One-Time Setup)

**Purpose**: Populate OpenSearch indices with all existing data from MySQL

**How it works**:
1. **SyncService** (`sync.service.ts`) connects to MySQL `migrated_db`
2. Queries items, stores, categories with JOINs to get complete data
3. Calculates statistics (order counts, ratings, trending scores)
4. Bulk indexes to OpenSearch using bulk API (500-1000 items per batch)

**Key Methods**:
- `getItemStats(moduleId)` - Fetches item statistics from MySQL
- `getStoreStats(moduleId)` - Fetches store statistics
- `syncItemStats(moduleId, indexName)` - Syncs items to OpenSearch
- `syncStoreStats(moduleId, indexName)` - Syncs stores to OpenSearch
- `syncAll()` - Syncs all modules (4, 5, 13)

**Example Query**:
```sql
SELECT 
  i.id as item_id,
  COUNT(DISTINCT od.order_id) as order_count,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(DISTINCT CASE 
    WHEN o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
    THEN od.order_id 
  END) as last_7_days_orders
FROM items i
LEFT JOIN order_details od ON i.id = od.item_id
LEFT JOIN orders o ON od.order_id = o.id 
LEFT JOIN reviews r ON i.id = r.item_id
WHERE i.module_id = 4
GROUP BY i.id
```

### 2. **Incremental Updates** (Real-Time)

**Current Implementation**: Manual sync via API endpoint

**How it works**:
- API endpoint `/sync/all` triggers `syncAll()` method
- Recalculates statistics and updates OpenSearch documents
- Uses OpenSearch `update` API (not `index`) to preserve existing data

**Future Enhancement**: CDC (Change Data Capture)
- Debezium connector watches MySQL binlog
- Streams changes to Kafka/Redpanda
- Kafka Connect syncs to OpenSearch automatically

### 3. **Search-Time Indexing** (On-Demand)

**Vector Embeddings**:
- When semantic search is requested, embedding service generates vectors
- Vectors are stored in OpenSearch `knn_vector` fields
- Enables similarity search using cosine distance

**Field Mapping**:
```json
{
  "name": { "type": "text" },
  "description": { "type": "text" },
  "item_vector": { 
    "type": "knn_vector", 
    "dimension": 384,
    "method": { "name": "hnsw", "space_type": "l2" }
  }
}
```

---

## 📈 Current Indexing Strategy

### Module-to-Index Mapping

| Module ID | Module Type | Item Index | Store Index |
|-----------|-------------|------------|-------------|
| 4 | food | `food_items` | `food_stores` |
| 5 | ecommerce | `ecom_items` | `ecom_stores` |
| 13 | ecommerce | `ecom_items` | `ecom_stores` |

### Indexed Fields

**Items**:
- Basic: `id`, `name`, `description`, `price`, `image`, `veg`
- Store: `store_id`, `store_name`, `store_latitude`, `store_longitude`, `zone_id`
- Category: `category_id`, `category_name`
- Statistics: `order_count`, `review_count`, `avg_rating`, `revenue`
- Calculated: `trending_score`, `quality_score`, `popularity_score`
- Vector: `item_vector` (384 dimensions)

**Stores**:
- Basic: `id`, `name`, `address`, `logo`, `cover_photo`
- Location: `latitude`, `longitude`, `zone_id`
- Statistics: `order_count`, `avg_order_value`, `review_count`, `avg_rating`, `total_revenue`
- Calculated: `performance_score`

---

## 🚀 Optimization Recommendations

### 1. **Indexing Performance** ⚡

**Current**: Sequential bulk indexing (500 items/batch)

**Recommendations**:

#### A. **Parallel Batch Processing**
```typescript
// Instead of:
for (const stat of stats) {
  await indexItem(stat);
}

// Use:
const batches = chunkArray(stats, 500);
await Promise.all(batches.map(batch => bulkIndex(batch)));
```

**Expected Improvement**: 3-5x faster indexing

#### B. **Connection Pooling**
```typescript
// Current: 10 connections
connectionLimit: 10

// Recommended: Scale based on load
connectionLimit: Math.min(20, Math.ceil(itemCount / 100))
```

#### C. **Bulk Size Optimization**
- **Current**: 500 items per batch
- **Recommended**: 
  - Small datasets (<1000): 100-200 items
  - Medium (1000-10000): 500-1000 items
  - Large (>10000): 1000-2000 items

**Test different sizes** to find optimal for your data:
```bash
# Measure indexing time
time curl -X POST http://localhost:3100/sync/all
```

### 2. **Index Structure** 📊

#### A. **Shard Configuration**

**Current**: Default (1 primary shard)

**Recommended**:
```json
{
  "settings": {
    "number_of_shards": 3,      // For 13K+ items
    "number_of_replicas": 1,     // For redundancy
    "refresh_interval": "30s"    // Balance freshness vs performance
  }
}
```

**Why**:
- More shards = better parallel search performance
- Replicas = fault tolerance
- Refresh interval = balance between real-time and performance

#### B. **Field Mapping Optimization**

**Current**: All text fields use default analyzer

**Recommended**:
```json
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" },      // For exact match
          "suggest": { "type": "completion" }    // For autocomplete
        }
      },
      "description": {
        "type": "text",
        "analyzer": "english"                   // Better for English text
      }
    }
  }
}
```

### 3. **Real-Time Sync** 🔄

**Current**: Manual sync via API

**Recommended**: CDC (Change Data Capture)

**Setup**:
1. Enable MySQL binlog (already done in docker-compose)
2. Configure Debezium connector:
```json
{
  "name": "mysql-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "mysql",
    "database.port": "3306",
    "database.user": "root",
    "database.password": "${MYSQL_ROOT_PASSWORD}",
    "database.server.id": "1",
    "database.server.name": "mangwale",
    "database.include.list": "migrated_db",
    "table.include.list": "migrated_db.items,migrated_db.stores"
  }
}
```

**Benefits**:
- ✅ Real-time updates (< 1 second latency)
- ✅ No manual sync needed
- ✅ Automatic conflict resolution
- ✅ Handles deletes automatically

### 4. **Caching Strategy** 💾

**Current**: Redis caching for search results

**Recommendations**:

#### A. **Cache Statistics**
```typescript
// Cache frequently accessed statistics
const cacheKey = `item_stats:${itemId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Calculate and cache for 5 minutes
const stats = await calculateStats(itemId);
await redis.setex(cacheKey, 300, JSON.stringify(stats));
```

#### B. **Cache Invalidation**
```typescript
// Invalidate on update
await redis.del(`item_stats:${itemId}`);
await redis.del(`search:food:*`); // Pattern-based invalidation
```

### 5. **Search Performance** 🔍

#### A. **Index Aliases**
```json
// Use aliases for zero-downtime reindexing
PUT /food_items_v4
POST /_aliases
{
  "actions": [
    { "add": { "index": "food_items_v4", "alias": "food_items" } },
    { "remove": { "index": "food_items_v3", "alias": "food_items" } }
  ]
}
```

#### B. **Query Optimization**
```typescript
// Use filter instead of must for non-scoring queries
{
  "query": {
    "bool": {
      "must": [{ "match": { "name": "pizza" } }],      // Scoring
      "filter": [{ "term": { "module_id": 4 } }]        // No scoring (faster)
    }
  }
}
```

### 6. **Monitoring & Alerts** 📊

**Recommended Metrics**:
- Indexing rate (items/second)
- Search latency (p50, p95, p99)
- Index size growth
- Cache hit rate
- Error rate

**Tools**:
- OpenSearch Dashboards (already running on port 5601)
- Prometheus + Grafana (optional)
- Application logs (structured JSON)

---

## ❓ Questions & Decisions Needed

### 1. **Indexing Frequency** ⏰

**Question**: How often should statistics be recalculated?

**Options**:
- **A. Real-time** (CDC) - Updates within 1 second of MySQL change
  - ✅ Most accurate
  - ❌ Higher resource usage
  - ❌ More complex setup

- **B. Scheduled** (Cron) - Every 5-15 minutes
  - ✅ Simple, reliable
  - ✅ Predictable load
  - ❌ Slight delay in statistics

- **C. On-demand** (Current) - Manual trigger via API
  - ✅ Full control
  - ❌ Requires manual intervention
  - ❌ Easy to forget

**Recommendation**: **Option B** (Scheduled every 10 minutes) for statistics, **Option A** (CDC) for basic data (name, price, etc.)

### 2. **Index Sharding** 📦

**Question**: How many shards should we use?

**Current**: 1 shard (default)

**Options**:
- **A. 1 shard** (Current)
  - ✅ Simple
  - ❌ Limited scalability
  - ❌ Single point of failure

- **B. 3 shards** (Recommended for 13K items)
  - ✅ Better parallel search
  - ✅ Can scale horizontally
  - ✅ Good balance

- **C. 5+ shards** (For future growth)
  - ✅ Maximum scalability
  - ❌ Overhead for small datasets
  - ❌ More complex management

**Recommendation**: **Option B** (3 shards) - Good balance for current size with room to grow

### 3. **Vector Search** 🧠

**Question**: Should we pre-compute all embeddings or generate on-demand?

**Current**: On-demand (generated when semantic search requested)

**Options**:
- **A. Pre-compute** (Store all vectors in index)
  - ✅ Faster search
  - ✅ Better user experience
  - ❌ Larger index size (~50KB per item)
  - ❌ Slower initial sync

- **B. On-demand** (Current)
  - ✅ Smaller index
  - ✅ Faster initial sync
  - ❌ Slower first search per item
  - ❌ Requires embedding service to be always available

**Recommendation**: **Option A** (Pre-compute) for frequently searched items, **Option B** (On-demand) for long-tail items

### 4. **Statistics Calculation** 📈

**Question**: Which statistics are most important for search ranking?

**Current Statistics**:
- `order_count` - Total orders
- `review_count` - Number of reviews
- `avg_rating` - Average rating
- `trending_score` - Growth in last 7 days
- `quality_score` - Combined rating + review score
- `popularity_score` - Combined order + review + rating score

**Recommendations**:
1. **Keep**: `trending_score`, `popularity_score` (used in search ranking)
2. **Optimize**: Pre-calculate in MySQL view or materialized table
3. **Add**: `conversion_rate` (orders / views) if tracking available

### 5. **Backup Strategy** 💾

**Question**: How should we backup OpenSearch indices?

**Current**: No automated backup

**Options**:
- **A. Snapshot API** (Recommended)
  ```bash
  # Create snapshot repository
  PUT /_snapshot/backup_repo
  {
    "type": "fs",
    "settings": { "location": "/backup/opensearch" }
  }
  
  # Schedule daily snapshots
  PUT /_snapshot/backup_repo/daily_snapshot
  ```

- **B. Volume Backup** (Docker volumes)
  ```bash
  docker run --rm -v opensearch-data:/data -v /backup:/backup \
    alpine tar czf /backup/opensearch-$(date +%Y%m%d).tar.gz -C /data .
  ```

**Recommendation**: **Option A** (Snapshot API) - More reliable, incremental backups

---

## 🎯 Immediate Action Items

### High Priority
1. ✅ **Database updated** to `migrated_db` (DONE)
2. ⏳ **Set up scheduled sync** (Cron job every 10 minutes)
3. ⏳ **Optimize shard count** (3 shards for better performance)
4. ⏳ **Set up monitoring** (OpenSearch Dashboards)

### Medium Priority
5. ⏳ **Implement CDC** (Real-time sync)
6. ⏳ **Pre-compute embeddings** (For top 1000 items)
7. ⏳ **Set up backups** (Daily snapshots)

### Low Priority
8. ⏳ **Query optimization** (Filter vs must)
9. ⏳ **Cache optimization** (Statistics caching)
10. ⏳ **Index aliases** (Zero-downtime reindexing)

---

## 📝 Configuration Summary

**Current Configuration**:
- **Database**: `migrated_db` ✅
- **Sync Method**: Manual API trigger
- **Index Shards**: 1 (default)
- **Bulk Size**: 500 items
- **Vector Search**: On-demand

**Recommended Configuration**:
- **Database**: `migrated_db` ✅
- **Sync Method**: Scheduled (every 10 min) + CDC for real-time
- **Index Shards**: 3
- **Bulk Size**: 1000 items (test to optimize)
- **Vector Search**: Pre-computed for popular items

---

## 🔗 Related Files

- **Sync Service**: `apps/search-api/src/sync/sync.service.ts`
- **Module Service**: `apps/search-api/src/search/module.service.ts`
- **Docker Compose**: `docker-compose.production.yml`
- **Environment**: `.env.production`

---

**Last Updated**: November 20, 2025  
**Next Review**: After implementing scheduled sync

