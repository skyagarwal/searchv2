# 🔍 Search System Status & Recovery Plan
**Date**: November 5, 2025  
**Status**: ❌ **SEARCH NOT WORKING - INDICES EMPTY**

---

## 🚨 CRITICAL ISSUE DISCOVERED

### Problem Summary
Your OpenSearch indices are **completely empty** - no food items, no products, no restaurants indexed!

### Current State
```bash
# OpenSearch Indices Status
✅ OpenSearch Service: Running on localhost:9200
❌ Food Index: Does NOT exist
❌ Ecom Index: Does NOT exist  
❌ Booking Index: Does NOT exist
⚠️ Only system indices present (.plugins-ml-config, .opensearch-observability)
```

### Data Source Status
```bash
# MySQL Database: new_mangwale (103.160.107.41)
✅ Connected successfully
✅ Items table: 1 item (Demo Product)
⚠️ temp_products: 90 + 85 + 1 = 176 items
❌ Most tables are empty (restaurants, stores, etc.)
```

---

## 🔎 ROOT CAUSE ANALYSIS

### What Happened?
1. **OpenSearch indices were never populated** - The sync scripts haven't run
2. **Production data is minimal** - Only demo/temp data exists
3. **AI Chat is searching empty indices** - That's why search returns nothing!

### Architecture (As Designed)
```
MySQL (new_mangwale) 
    ↓ (CDC/Sync)
OpenSearch Indices (food, ecom, booking)
    ↓ (Search API)
AI Chat System (mangwale-ai on port 3200)
    ↓
User gets search results
```

### Current Broken Flow
```
AI Chat → OpenSearch (EMPTY!) → No results ❌
```

---

## 📊 WHAT YOU HAVE (Working Components)

### ✅ Infrastructure Running
- **OpenSearch**: localhost:9200 (healthy)
- **MySQL**: 103.160.107.41:3306 (connected)
- **Redis**: localhost:6379 (running)
- **Redpanda/Kafka**: localhost:9092 (running)
- **Embedding Service**: localhost:3101 (unhealthy but running)
- **ClickHouse**: localhost:8123 (running)

### ✅ Code & Scripts Available
Located in `/home/ubuntu/Devs/Search/`:
- `sync-mysql-complete.py` - Full MySQL → OpenSearch sync
- `quick-sync-mysql-to-opensearch.py` - Quick sync script
- `scripts/opensearch-setup-food.js` - Food index setup
- `scripts/opensearch-setup-ecom.js` - Ecom index setup
- `scripts/opensearch-setup-booking.js` - Booking index setup
- `embedding-service.py` - Vector embeddings for semantic search

### ✅ Search API (apps/search-api)
- NestJS API on port 3100
- Has search.service.ts with OpenSearch queries
- **BUT**: Not being used by AI chat currently!

---

## 🎯 RECOVERY PLAN

### Phase 1: Get Immediate Search Working (30 minutes)

#### Option A: Use Direct MySQL Search (Quick Fix)
**Best for**: Getting AI chat working TODAY

```typescript
// Add to mangwale-admin-backend-v1/src/modules/food/food.service.ts
async searchItems(query: string, location?: { lat: number, lng: number }) {
  const sql = `
    SELECT 
      i.*,
      s.name as store_name,
      s.latitude,
      s.longitude
    FROM items i
    LEFT JOIN stores s ON i.store_id = s.id
    WHERE i.status = 1
      AND (
        i.name LIKE ?
        OR i.description LIKE ?
        OR s.name LIKE ?
      )
    LIMIT 20
  `;
  
  const searchTerm = `%${query}%`;
  return await this.db.query(sql, [searchTerm, searchTerm, searchTerm]);
}
```

#### Option B: Populate OpenSearch (Proper Fix)
**Best for**: Long-term solution with semantic search

**Step 1: Create Indices**
```bash
cd /home/ubuntu/Devs/Search

# Create food index
node scripts/opensearch-setup-food.js

# Create ecom index  
node scripts/opensearch-setup-ecom.js

# Create booking index
node scripts/opensearch-setup-booking.js
```

**Step 2: Sync Data from MySQL**
```bash
# Quick sync (if you have minimal data)
python3 quick-sync-mysql-to-opensearch.py

# OR Full sync (for production data)
python3 sync-mysql-complete.py
```

**Step 3: Verify Data**
```bash
# Check food index
curl -X GET "http://localhost:9200/food/_count"

# Search test
curl -X POST "http://localhost:9200/food/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "pizza",
      "fields": ["name^3", "description", "store_name"]
    }
  },
  "size": 5
}'
```

---

## 🔌 INTEGRATION WITH AI CHAT

### Current AI Chat Architecture
Located in `/home/ubuntu/mangwale-admin-backend-v1/`:
- NestJS backend on port 8080 (PM2: mangwale-admin-backend)
- WebSocket chat system
- Connects to PHP backend for some features

### Integration Options

#### Option 1: Add Search Module to AI Backend (Recommended)
```bash
cd /home/ubuntu/mangwale-admin-backend-v1

# Install OpenSearch client
npm install @opensearch-project/opensearch

# Create search module
mkdir -p src/modules/search
```

Create `src/modules/search/search.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';

@Injectable()
export class SearchService {
  private client: Client;

  constructor() {
    this.client = new Client({
      node: 'http://localhost:9200',
    });
  }

  async searchFood(query: string, options?: {
    location?: { lat: number; lng: number };
    filters?: any;
    limit?: number;
  }) {
    const body: any = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ['name^3', 'description', 'store_name'],
                fuzziness: 'AUTO',
              },
            },
          ],
          filter: [],
        },
      },
      size: options?.limit || 20,
    };

    // Add geo-distance filter if location provided
    if (options?.location) {
      body.query.bool.filter.push({
        geo_distance: {
          distance: '10km',
          location: options.location,
        },
      });
      
      // Sort by distance
      body.sort = [
        {
          _geo_distance: {
            location: options.location,
            order: 'asc',
            unit: 'km',
          },
        },
      ];
    }

    try {
      const result = await this.client.search({
        index: 'food',
        body,
      });

      return {
        total: result.body.hits.total.value,
        items: result.body.hits.hits.map(hit => ({
          ...hit._source,
          distance: hit.sort ? hit.sort[0] : null,
        })),
      };
    } catch (error) {
      console.error('OpenSearch error:', error);
      throw error;
    }
  }

  async searchEcommerce(query: string, options?: any) {
    // Similar implementation for ecom index
  }

  async searchServices(query: string, options?: any) {
    // Similar implementation for booking index
  }
}
```

#### Option 2: Use Existing Search API (Port 3100)
The Search folder already has a NestJS search API. You can:
1. Start the search API service
2. Call it from AI chat via HTTP
3. Less coupling, microservices approach

---

## 📋 DATA PREPARATION

### Current Data Status
```
MySQL new_mangwale database:
- items: 1 item (Demo Product)
- temp_products: 176 items
- Most other tables empty
```

### Data Import Options

#### Option 1: Use SQL Dump
You have: `admin_prod (61) (1).sql` (large production dump)

```bash
cd /home/ubuntu/Devs/Search

# Import production data
mysql -h 103.160.107.41 -u root -p'test@mangwale2025' new_mangwale < "admin_prod (61) (1).sql"

# Then sync to OpenSearch
python3 sync-mysql-complete.py
```

#### Option 2: Use Existing temp_products
```sql
-- Copy temp_products to items table
INSERT INTO items (name, description, price, category_id, store_id, status, module_id)
SELECT name, description, price, category_id, store_id, 1, 1
FROM temp_products
WHERE name IS NOT NULL;
```

#### Option 3: Create Sample Data
For testing, create sample restaurants and items:
```sql
-- Insert sample stores
INSERT INTO stores (name, latitude, longitude, address, module_id, zone_id) VALUES
('Pizza Palace', 19.9975, 73.7898, 'Nashik', 1, 1),
('Burger Hub', 19.9950, 73.7850, 'Nashik', 1, 1),
('Curry House', 20.0000, 73.7900, 'Nashik', 1, 1);

-- Insert sample food items
INSERT INTO items (name, description, price, category_id, store_id, status, module_id, veg) VALUES
('Margherita Pizza', 'Classic cheese pizza', 299, 1, 1, 1, 1, 1),
('Pepperoni Pizza', 'Spicy pepperoni pizza', 399, 1, 1, 1, 1, 0),
('Chicken Burger', 'Grilled chicken burger', 199, 2, 2, 1, 1, 0),
('Veg Burger', 'Healthy veg burger', 149, 2, 2, 1, 1, 1),
('Butter Chicken', 'Rich butter chicken', 349, 3, 3, 1, 1, 0);
```

---

## 🚀 RECOMMENDED ACTION PLAN

### TODAY (30 minutes - Get Search Working)

**Step 1: Check what data you want to use**
```bash
# Option A: Import production dump
cd /home/ubuntu/Devs/Search
ls -lh "admin_prod (61) (1).sql"

# Option B: Use temp_products
mysql -h 103.160.107.41 -u root -p'test@mangwale2025' new_mangwale -e "SELECT COUNT(*) FROM temp_products"
```

**Step 2: Create OpenSearch indices**
```bash
cd /home/ubuntu/Devs/Search
node scripts/opensearch-setup-food.js
node scripts/opensearch-setup-ecom.js
```

**Step 3: Sync data**
```bash
python3 quick-sync-mysql-to-opensearch.py
```

**Step 4: Verify**
```bash
curl "http://localhost:9200/food/_count"
curl "http://localhost:9200/ecom/_count"
```

**Step 5: Test search**
```bash
curl -X POST "http://localhost:9200/food/_search" -H 'Content-Type: application/json' -d'
{
  "query": { "match": { "name": "pizza" } },
  "size": 5
}'
```

### THIS WEEK (2-3 hours - Full Integration)

1. **Add Search Module to AI Backend**
   - Install OpenSearch client
   - Create search.service.ts
   - Add search endpoints
   - Update AI chat to use search

2. **Enable Semantic Search**
   - Fix embedding service (currently unhealthy)
   - Generate embeddings for all items
   - Update indices with vectors
   - Enable vector search

3. **Add Real-time Sync**
   - Set up Kafka Connect CDC
   - Stream MySQL changes to OpenSearch
   - Keep indices always up-to-date

---

## 🎯 NEXT STEPS (Choose Your Path)

### Path A: Quick Fix (30 min)
1. Import data or use temp_products
2. Create OpenSearch indices
3. Sync data
4. Add basic search to AI chat
**Result**: Search works with keyword matching

### Path B: Proper Implementation (3 hours)
1. Import production data
2. Set up all OpenSearch indices
3. Integrate Search API with AI chat
4. Fix embedding service
5. Enable semantic/vector search
**Result**: Full-featured search with AI understanding

### Path C: Minimal Viable (15 min)
1. Skip OpenSearch for now
2. Add direct MySQL search to AI backend
3. Use LIKE queries
**Result**: Basic search works, no semantic features

---

## 📞 WHAT DO YOU WANT TO DO?

**Questions to decide:**
1. Do you have production data to import? (the SQL dump?)
2. Do you want semantic/AI search or just keyword search?
3. Should we use the existing Search API or add search directly to AI backend?
4. How urgent is this? (Quick fix vs proper implementation)

**Tell me your preference and I'll execute the plan!** 🚀

---

## 📝 FILES TO CHECK/MODIFY

### For MySQL Direct Search (Quick)
- `/home/ubuntu/mangwale-admin-backend-v1/src/modules/food/food.service.ts`

### For OpenSearch Integration (Proper)
- `/home/ubuntu/Devs/Search/scripts/opensearch-setup-*.js`
- `/home/ubuntu/Devs/Search/sync-mysql-complete.py`
- `/home/ubuntu/mangwale-admin-backend-v1/src/modules/search/` (create new)

### AI Chat Files
- `/home/ubuntu/mangwale-admin-backend-v1/src/conversation/conversation.service.ts`
- `/home/ubuntu/mangwale-admin-backend-v1/src/agents/` (food, parcel, booking agents)

---

**Status**: Waiting for your decision on which path to take! 🎯
