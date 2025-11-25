# 🚀 MODULE-AWARE SEARCH - IMPLEMENTATION PLAN

**Date**: November 10, 2025  
**Status**: Ready for Implementation  
**Architecture**: Option C - Unified Search with Module Filters

---

## 📋 REQUIREMENTS CONFIRMED

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| **Module Instance Search** | ✅ Q1 | Use specific `module_id` for targeted search |
| **Module Tabs UI** | ✅ Q2 | Mobile app shows separate module tabs |
| **AI Multi-Module Search** | ✅ Q3 | AI can ask questions and search related modules |
| **Cross-Module Capability** | ✅ Q4 | Support searching across multiple modules |
| **Store-Level Zones** | ✅ Q5 | Zones assigned at store level (store.zone_id) |
| **Dual Search APIs** | ✅ Q6 | Both global and module-specific endpoints |
| **One Store per Module** | ✅ Q7 | Current: store.module_id (FK, single value) |
| **Semantic Cross-Module** | ✅ Q8 | Vector search works across modules |

---

## 🏗️ NEW API ARCHITECTURE

### **1. UNIFIED SEARCH ENDPOINT** (Primary)

```typescript
GET /search
Query Parameters:
  // REQUIRED
  q: string                     // Search query

  // MODULE FILTERING (Choose one or combine)
  module_id?: number            // Search specific module (e.g., 4 = Food)
  module_ids?: string           // Multiple modules (e.g., "4,5,13")
  module_type?: string          // All modules of type (e.g., "food", "ecommerce")
  
  // CATEGORY (Requires module context)
  category_id?: number          // Must provide module_id or module_ids
  
  // GEO FILTERING
  lat?: number                  // User latitude
  lon?: number                  // User longitude
  radius_km?: number            // Search radius
  zone_id?: number              // User's zone (optional, for zone-based filtering)
  
  // SEARCH TYPE
  semantic?: boolean            // Enable vector search (default: false)
  
  // FILTERS
  veg?: boolean                 // Vegetarian filter
  price_min?: number
  price_max?: number
  rating_min?: number
  
  // PAGINATION
  page?: number                 // Default: 1
  size?: number                 // Default: 20, max: 100
  
  // SORTING
  sort?: string                 // distance | price_asc | price_desc | rating | popularity

Response:
{
  "query": "pizza",
  "modules": [                   // Modules searched
    { "id": 4, "name": "Food", "type": "food" }
  ],
  "items": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "size": 20,
    "by_module": {               // Results breakdown by module
      "4": { "count": 120, "name": "Food" },
      "5": { "count": 30, "name": "Shop" }
    }
  },
  "facets": {
    "modules": [                 // Available modules with counts
      { "id": 4, "name": "Food", "count": 120 },
      { "id": 5, "name": "Shop", "count": 30 }
    ],
    "categories": [...],
    "price_ranges": [...]
  }
}
```

**Examples:**

```bash
# Search specific module
GET /search?q=pizza&module_id=4

# Search multiple modules
GET /search?q=healthy&module_ids=4,5,13

# Search all food-type modules
GET /search?q=biryani&module_type=food

# Search all active modules (global)
GET /search?q=chicken

# Category search (module-aware)
GET /search?module_id=4&category_id=288&lat=19.99&lon=73.78

# Semantic search across modules
GET /search?q=healthy%20breakfast&module_ids=4,5&semantic=1
```

---

### **2. MODULE-SPECIFIC ENDPOINTS** (Backward Compatible)

```typescript
// Food modules
GET /search/food?q=pizza
GET /search/food?module_id=4&q=pizza           // Specific food module
GET /search/food/category?module_id=4&category_id=288
GET /search/food/stores?module_id=4&zone_id=4
GET /search/food/suggest?module_id=4&q=piz

// Ecommerce modules
GET /search/ecom?q=milk
GET /search/ecom?module_id=5&q=milk            // Shop module
GET /search/ecom?module_id=13&q=dog            // Pet Care module
GET /search/ecom/category?module_id=5&category_id=25

// Grocery modules
GET /search/grocery?q=vegetables
GET /search/grocery?module_id=17&q=fruits

// Parcel modules
GET /search/parcel?module_id=3                 // Local Delivery
GET /search/parcel?module_id=14                // Ambulance

// Pharmacy modules
GET /search/pharmacy?q=medicine
```

**Mapping:**
- `/search/food` → Search all active modules where `module_type='food'`
- `/search/ecom` → Search all active modules where `module_type='ecommerce'`
- Can add `module_id` parameter to target specific module instance

---

### **3. GLOBAL SEARCH** (All Modules)

```typescript
GET /search/all
Query Parameters:
  q: string                     // Search query
  lat?, lon?, radius_km?        // Geo filters
  semantic?: boolean            // Vector search
  page?, size?                  // Pagination
  sort?: string                 // Sorting

Response:
{
  "query": "healthy",
  "modules_searched": ["Food", "Shop", "Pet Care", "Grocery"],
  "results_by_module": {
    "Food": {
      "module_id": 4,
      "count": 45,
      "items": [...]
    },
    "Shop": {
      "module_id": 5,
      "count": 12,
      "items": [...]
    },
    "Pet Care": {
      "module_id": 13,
      "count": 8,
      "items": [...]
    }
  },
  "total_results": 65,
  "meta": { ... }
}
```

---

### **4. SEMANTIC SEARCH** (Cross-Module)

```typescript
GET /search/semantic
Query Parameters:
  q: string                     // Required
  module_id?: number            // Optional: specific module
  module_ids?: string           // Optional: multiple modules
  module_type?: string          // Optional: module type
  // + all standard filters

Response:
{
  "query": "healthy breakfast options",
  "semantic": true,
  "items": [
    {
      "id": "123",
      "name": "Healthy Oats Bowl",
      "module": { "id": 4, "name": "Food" },
      "similarity_score": 0.92,
      ...
    },
    {
      "id": "456",
      "name": "Organic Breakfast Cereal",
      "module": { "id": 5, "name": "Shop" },
      "similarity_score": 0.88,
      ...
    }
  ]
}
```

---

### **5. SUGGESTIONS/AUTOCOMPLETE**

```typescript
// Module-specific suggestions
GET /search/suggest
Query Parameters:
  q: string                     // Required (min 2 chars)
  module_id?: number            // Optional: specific module
  module_ids?: string           // Optional: multiple modules
  size?: number                 // Default: 10

Response:
{
  "query": "chi",
  "suggestions": {
    "items": [
      { "text": "Chicken Biryani", "module": "Food", "module_id": 4 },
      { "text": "Chicken Masala", "module": "Food", "module_id": 4 },
      { "text": "Chicken Food (Dog)", "module": "Pet Care", "module_id": 13 }
    ],
    "stores": [
      { "text": "Chicken Palace", "module": "Food", "module_id": 4 }
    ],
    "categories": [
      { "text": "Chicken Items", "module_id": 4, "category_id": 145 }
    ]
  }
}

// Global suggestions (all modules)
GET /search/suggest/all?q=chi
```

---

## 🛠️ IMPLEMENTATION DETAILS

### **Database Queries**

#### **1. Get Active Modules**

```sql
-- All active modules
SELECT id, module_name, module_type, status 
FROM modules 
WHERE status = 1;

-- Active modules of specific type
SELECT id, module_name, module_type 
FROM modules 
WHERE status = 1 AND module_type = 'food';

-- Active modules in specific zone
SELECT DISTINCT m.id, m.module_name, m.module_type
FROM modules m
INNER JOIN module_zone mz ON m.id = mz.module_id
WHERE m.status = 1 AND mz.zone_id = 4;
```

#### **2. Module-Aware Category Search**

```sql
-- Validate category belongs to module
SELECT c.id, c.name, c.parent_id
FROM categories c
WHERE c.id = ? AND c.module_id = ?;

-- Get items in category (with module validation)
SELECT i.*
FROM items i
INNER JOIN stores s ON i.store_id = s.id
WHERE i.category_id = ? 
  AND s.module_id = ?
  AND i.status = 1;
```

#### **3. Zone Filtering (Store-Level)**

```sql
-- Items in specific zone
SELECT i.*, s.zone_id, z.name as zone_name
FROM items i
INNER JOIN stores s ON i.store_id = s.id
LEFT JOIN zones z ON s.zone_id = z.id
WHERE s.zone_id = ?
  AND s.module_id = ?
  AND i.status = 1;

-- Check if store is in user's zone
SELECT COUNT(*) FROM stores
WHERE id = ? AND zone_id = ?;
```

#### **4. Multi-Module Search**

```sql
-- Items from multiple modules
SELECT i.*, s.module_id, m.module_name
FROM items i
INNER JOIN stores s ON i.store_id = s.id
INNER JOIN modules m ON s.module_id = m.id
WHERE s.module_id IN (4, 5, 13)
  AND m.status = 1
  AND i.status = 1;
```

---

### **OpenSearch Index Strategy**

#### **Current Indices:**
- `food_items_v3` → All food-type module items
- `ecom_items_v3` → All ecommerce-type module items

#### **Recommended Changes:**

**Option A: Module Field in Existing Indices** (RECOMMENDED)
```json
{
  "mappings": {
    "properties": {
      "module_id": { "type": "integer" },           // Add this
      "module_name": { "type": "keyword" },         // Add this
      "module_type": { "type": "keyword" },         // Add this
      "name": { "type": "text" },
      "category_id": { "type": "long" },
      "store_id": { "type": "long" },
      "item_vector": { "type": "knn_vector", "dimension": 384 },
      ...
    }
  }
}
```

**Search with module filter:**
```json
{
  "query": {
    "bool": {
      "must": [
        { "multi_match": { "query": "pizza", "fields": ["name^3", "description"] } }
      ],
      "filter": [
        { "term": { "module_id": 4 } }
      ]
    }
  }
}
```

**Option B: Separate Index per Module** (Not recommended - too many indices)
```
food_module_4_items    → Food module items
ecom_module_5_items    → Shop module items
ecom_module_13_items   → Pet Care module items
```

---

### **Search Service Implementation**

```typescript
// apps/search-api/src/search/search.service.ts

interface SearchOptions {
  q?: string;
  module_id?: number;
  module_ids?: number[];
  module_type?: string;
  category_id?: number;
  zone_id?: number;
  lat?: number;
  lon?: number;
  radius_km?: number;
  semantic?: boolean;
  veg?: boolean;
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  page?: number;
  size?: number;
  sort?: string;
}

@Injectable()
export class SearchService {
  
  // Main unified search method
  async search(options: SearchOptions) {
    // 1. Validate and resolve modules
    const modules = await this.resolveModules(options);
    
    // 2. Build OpenSearch query with module filters
    const query = this.buildQuery(options, modules);
    
    // 3. Execute search
    const results = options.semantic 
      ? await this.semanticSearch(query, modules)
      : await this.keywordSearch(query, modules);
    
    // 4. Enrich results with module information
    return this.enrichResults(results, modules);
  }
  
  private async resolveModules(options: SearchOptions) {
    if (options.module_id) {
      // Single module
      return this.getModuleById(options.module_id);
    } else if (options.module_ids) {
      // Multiple modules
      return this.getModulesByIds(options.module_ids);
    } else if (options.module_type) {
      // All modules of type
      return this.getModulesByType(options.module_type);
    } else {
      // All active modules
      return this.getActiveModules();
    }
  }
  
  private buildQuery(options: SearchOptions, modules: Module[]) {
    const moduleIds = modules.map(m => m.id);
    
    const query: any = {
      bool: {
        must: [],
        filter: [
          { terms: { module_id: moduleIds } }, // Module filter
        ]
      }
    };
    
    // Category filter (module-aware)
    if (options.category_id) {
      if (!options.module_id && !options.module_ids) {
        throw new BadRequestException('category_id requires module_id or module_ids');
      }
      query.bool.filter.push({ term: { category_id: options.category_id } });
    }
    
    // Zone filter (at store level)
    if (options.zone_id) {
      query.bool.filter.push({ term: { 'store.zone_id': options.zone_id } });
    }
    
    // Text search
    if (options.q) {
      query.bool.must.push({
        multi_match: {
          query: options.q,
          fields: ['name^3', 'description^1', 'category_name^2'],
          type: 'best_fields'
        }
      });
    }
    
    return query;
  }
  
  private async semanticSearch(query: any, modules: Module[]) {
    // Generate embedding for query
    const embedding = await this.embeddingService.generateEmbedding(query.q);
    
    // Search across module indices
    const indices = this.getIndicesForModules(modules);
    
    const knnQuery = {
      size: options.size || 20,
      query: {
        bool: {
          must: [
            { knn: { item_vector: { vector: embedding, k: 60 } } }
          ],
          filter: query.bool.filter
        }
      }
    };
    
    return await this.client.search({
      index: indices.join(','),
      body: knnQuery
    });
  }
  
  private getIndicesForModules(modules: Module[]): string[] {
    const indices = new Set<string>();
    
    for (const module of modules) {
      if (module.module_type === 'food') {
        indices.add('food_items_v3');
      } else if (module.module_type === 'ecommerce') {
        indices.add('ecom_items_v3');
      } else if (module.module_type === 'grocery') {
        indices.add('grocery_items_v3');
      }
      // Add more as needed
    }
    
    return Array.from(indices);
  }
}
```

---

### **AI Agent Enhancement**

```typescript
// apps/search-api/src/search/search.service.ts

async searchAgent(prompt: string, params: Record<string, string>) {
  // Parse user intent
  const intent = await this.parseIntent(prompt);
  
  // Determine modules to search
  const modules = await this.inferModules(intent, prompt);
  
  // If ambiguous, ask clarifying question
  if (modules.length > 1 && !intent.explicit_module) {
    return {
      type: 'clarification',
      question: `I found "${intent.query}" in ${modules.length} categories. Which would you like?`,
      options: modules.map(m => ({
        module_id: m.id,
        module_name: m.module_name,
        suggested_query: `Search in ${m.module_name}`
      }))
    };
  }
  
  // Execute search across inferred modules
  return this.search({
    q: intent.query,
    module_ids: modules.map(m => m.id),
    ...intent.filters
  });
}

private async inferModules(intent: any, prompt: string): Promise<Module[]> {
  const keywords = {
    food: ['food', 'eat', 'restaurant', 'meal', 'dinner', 'lunch', 'breakfast', 'biryani', 'pizza'],
    ecommerce: ['buy', 'shop', 'product', 'item', 'purchase', 'order'],
    grocery: ['vegetable', 'fruit', 'grocery', 'fresh'],
    parcel: ['deliver', 'send', 'parcel', 'courier'],
    pharmacy: ['medicine', 'pharmacy', 'medical', 'health']
  };
  
  const detectedTypes = new Set<string>();
  const lowerPrompt = prompt.toLowerCase();
  
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(w => lowerPrompt.includes(w))) {
      detectedTypes.add(type);
    }
  }
  
  if (detectedTypes.size === 0) {
    // No clear intent, search all
    return this.getActiveModules();
  }
  
  // Get active modules of detected types
  const modules = await this.getModulesByTypes(Array.from(detectedTypes));
  return modules;
}
```

---

## 📝 MIGRATION PLAN

### **Phase 1: Database Updates** (5 minutes)

**No schema changes needed!** ✅  
- ✅ `items.module_id` already exists  
- ✅ `stores.module_id` already exists  
- ✅ `categories.module_id` already exists  
- ✅ `modules` table has status field  
- ✅ `module_zone` junction table exists  

**Only need to verify data integrity:**

```sql
-- Ensure all items have correct module_id
UPDATE items i
INNER JOIN stores s ON i.store_id = s.id
SET i.module_id = s.module_id
WHERE i.module_id IS NULL OR i.module_id != s.module_id;

-- Count items per module
SELECT m.id, m.module_name, COUNT(i.id) as item_count
FROM modules m
LEFT JOIN stores s ON m.id = s.module_id
LEFT JOIN items i ON s.id = i.store_id
WHERE m.status = 1
GROUP BY m.id, m.module_name;
```

---

### **Phase 2: OpenSearch Index Updates** (30 minutes)

**Add module fields to existing indices:**

```bash
# Update food_items_v3 mapping
curl -X PUT "localhost:9200/food_items_v3/_mapping" -H 'Content-Type: application/json' -d'
{
  "properties": {
    "module_id": { "type": "integer" },
    "module_name": { "type": "keyword" },
    "module_type": { "type": "keyword" }
  }
}'

# Update ecom_items_v3 mapping
curl -X PUT "localhost:9200/ecom_items_v3/_mapping" -H 'Content-Type: application/json' -d'
{
  "properties": {
    "module_id": { "type": "integer" },
    "module_name": { "type": "keyword" },
    "module_type": { "type": "keyword" }
  }
}'

# Re-index data with module information
node scripts/reindex-with-modules.js
```

---

### **Phase 3: Search API Updates** (2 hours)

1. ✅ Update `search.service.ts` with new methods
2. ✅ Update `search.controller.ts` with new endpoints
3. ✅ Add module validation middleware
4. ✅ Update semantic search to support multi-module
5. ✅ Update suggestions to be module-aware
6. ✅ Add backward compatibility layer

---

### **Phase 4: Testing** (1 hour)

```bash
# Test single module search
curl "http://localhost:3100/search?q=pizza&module_id=4"

# Test multi-module search
curl "http://localhost:3100/search?q=healthy&module_ids=4,5,13"

# Test global search
curl "http://localhost:3100/search/all?q=chicken"

# Test category with module
curl "http://localhost:3100/search?module_id=4&category_id=288"

# Test semantic cross-module
curl "http://localhost:3100/search/semantic?q=healthy%20food&module_ids=4,5"

# Test AI agent
curl "http://localhost:3100/search/agent?q=show%20me%20healthy%20breakfast%20options"
```

---

## ✅ NEXT STEPS

**Ready to implement? I will:**

1. ✅ Update `search.service.ts` with unified search logic
2. ✅ Update `search.controller.ts` with new endpoints
3. ✅ Add module validation and helper methods
4. ✅ Update semantic search for cross-module support
5. ✅ Create data migration/reindex script
6. ✅ Add comprehensive tests
7. ✅ Update API documentation

**Shall I proceed with the implementation?** 🚀
