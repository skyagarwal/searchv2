# V2 Search Endpoints - Implementation Summary

## Overview

The V2 endpoints provide module_id, store_id, and category_id based search functionality, replacing the module-type based endpoints (`/search/food`, `/search/ecom`, etc.). These endpoints support flexible filtering combinations and enhanced search capabilities.

## Endpoints Flow

### 1. `/v2/search/suggest`

**Purpose**: Get autocomplete suggestions for items, stores, and categories.

**Flow**:
1. **Controller** (`search.controller.ts:565-590`):
   - Validates `category_id` requires `module_id` (categories are module-scoped)
   - Parses query parameters and builds filters object
   - Calls `searchService.suggestByModule()`

2. **Service** (`search.service.ts:2957-3177`):
   - Validates category belongs to module if both provided
   - Builds filter clauses for module_id, store_id, category_id
   - Searches across all item, store, and category indices in parallel
   - Applies geo-boosting if lat/lon provided
   - Returns deduplicated suggestions grouped by type

**Query Parameters**:
- `q` (required): Search query (min 2 characters)
- `module_id` (optional): Filter by module ID
- `store_id` (optional): Filter by store ID
- `category_id` (optional): Filter by category ID (requires module_id)
- `lat`, `lon` (optional): Geo coordinates for sorting
- `size` (optional): Max suggestions per type (default 5, max 50)

**Examples**:
```bash
# Module-specific suggestions
GET /v2/search/suggest?q=misal&module_id=4

# Store-specific suggestions
GET /v2/search/suggest?q=pizza&module_id=4&store_id=123

# Category-specific suggestions
GET /v2/search/suggest?q=italian&module_id=4&category_id=288

# All modules
GET /v2/search/suggest?q=pizza
```

---

### 2. `/v2/search/items`

**Purpose**: Search for items with enhanced search mechanism (searches by item name, category, and store name).

**Flow**:
1. **Controller** (`search.controller.ts:618-659`):
   - Validates `category_id` requires `module_id`
   - Parses all query parameters (module_id, store_id, category_id, filters, pagination, sorting)
   - Calls `searchService.searchItemsByModule()`

2. **Service** (`search.service.ts:3182-3696`):
   - Validates category belongs to module if both provided
   - Builds OpenSearch query with filters:
     - Module filter: `{ term: { module_id: X } }`
     - Store filter: `{ term: { store_id: X } }`
     - Category filter: `{ term: { category_id: X } }`
     - Additional filters: veg, price, rating, geo
   - **Enhanced Search Logic**:
     - If query provided: Searches items by name, then categories matching query, then stores matching query
     - Merges results with priority: name > category > store
     - If no items found: Falls back to searching stores matching query and returns items from those stores
   - Supports semantic search (vector/KNN) if `semantic=1`
   - Searches across all item indices in parallel
   - Applies sorting (distance, price, rating, popularity)
   - Returns paginated results with store names

**Query Parameters**:
- `q` (optional): Search query text
- `module_id` (optional): Filter by module ID
- `store_id` (optional): Filter by store ID
- `category_id` (optional): Filter by category ID (requires module_id)
- `semantic` (optional): Use semantic/vector search (1=enabled)
- `veg`, `price_min`, `price_max`, `rating_min`: Standard filters
- `lat`, `lon`, `radius_km`: Geo filters
- `page`, `size`: Pagination
- `sort`: Sort order (distance, price_asc, price_desc, rating, popularity)

**Examples**:
```bash
# Module-only search
GET /v2/search/items?q=pizza&module_id=4

# Store-only search
GET /v2/search/items?q=pizza&store_id=123

# Category-only search (requires module_id)
GET /v2/search/items?q=pizza&module_id=4&category_id=288

# Combined filters
GET /v2/search/items?q=pizza&module_id=4&store_id=123&category_id=288&veg=1

# Semantic search
GET /v2/search/items?q=spicy+chicken+dish&module_id=4&semantic=1

# All modules
GET /v2/search/items?q=pizza
```

---

### 3. `/v2/search/stores`

**Purpose**: Search stores with module_id and category_id filters. Returns stores that serve items in the specified category.

**Flow**:
1. **Controller** (`search.controller.ts:688-717`):
   - Validates `category_id` requires `module_id`
   - Parses query parameters
   - Calls `searchService.searchStoresByModule()`

2. **Service** (`search.service.ts:3713-4250`):
   - Validates category belongs to module if both provided
   - **Category-based Search** (if category_id provided):
     - Finds all items in the specified category
     - Extracts store_ids from those items
     - Searches stores by those store_ids
     - If query provided, also filters stores by name matching query
   - **Enhanced Search** (if query provided, no category_id):
     - Searches stores by name
     - Searches categories matching query, finds stores serving items in those categories
     - Searches items matching query, finds stores that have those items
     - Merges results with priority: name > category > item
   - Applies geo sorting if lat/lon provided
   - Returns paginated results with distance and delivery time

**Query Parameters**:
- `q` (optional): Search query text
- `module_id` (optional): Filter by module ID
- `category_id` (optional): Filter by category ID (returns stores that serve items in this category). Requires module_id.
- `lat`, `lon`, `radius_km`: Geo filters
- `page`, `size`: Pagination
- `sort`: Sort order (distance, popularity)

**Examples**:
```bash
# Module-only search
GET /v2/search/stores?q=misal&module_id=4

# Category-only search (requires module_id)
GET /v2/search/stores?module_id=4&category_id=288

# Combined: Module + Category
GET /v2/search/stores?q=misal&module_id=4&category_id=288

# All modules
GET /v2/search/stores?q=pizza
```

---

## Filtering Logic

### Module-wise Search
- **Items**: `module_id` filters items to specific module
- **Stores**: `module_id` filters stores to specific module
- **Suggest**: `module_id` filters suggestions to specific module

### Store-wise Search
- **Items**: `store_id` filters items to specific store
- **Suggest**: `store_id` filters items and categories to specific store

### Category-wise Search
- **Items**: `category_id` filters items to specific category (requires `module_id`)
- **Stores**: `category_id` returns stores that serve items in that category (requires `module_id`)
- **Suggest**: `category_id` filters items and stores to specific category (requires `module_id`)

### Combined Filters
- **module_id + store_id**: Items from that store in that module
- **module_id + category_id**: Items/stores in that category of that module
- **store_id + category_id**: Items of that category from that store (requires module_id validation)
- **module_id + store_id + category_id**: Items of that category from that store in that module

---

## Validation Rules

1. **category_id requires module_id**: Categories are module-scoped, not globally unique
   - Validated in controller (throws `BadRequestException`)
   - Error: `"category_id requires module_id parameter (categories are module-scoped, not globally unique)"`

2. **Category belongs to module**: If both `category_id` and `module_id` provided, validates category exists in module
   - Validated in service using `moduleService.validateCategoryModule()`
   - Error: `"Category X does not exist in module Y"`

---

## AI/Semantic Search Integration

The items endpoint supports semantic/vector search when `semantic=1`:

1. **Flow**:
   - Controller passes `semantic` flag to service
   - Service calls `embeddingService.generateEmbedding(query)` to get vector
   - Uses OpenSearch native KNN query with `item_vector` field
   - Applies same filters (module_id, store_id, category_id, etc.)
   - Returns results ranked by vector similarity

2. **Fallback**: If embedding generation fails, falls back to keyword search

---

## Analytics Integration

All endpoints log search events to ClickHouse via `AnalyticsService`:
- Module, query, filters, geo coordinates, results count
- Used for trending queries analysis (`/analytics/trending`)

---

## Index Strategy

The system searches across multiple OpenSearch indices:

- **Item Indices**: `food_items`, `ecom_items`, `rooms_index`, `services_index`, `movies_catalog`
- **Store Indices**: `food_stores`, `ecom_stores`, `rooms_stores`, `services_stores`, `movies_showtimes`
- **Category Indices**: `food_categories`, `ecom_categories`, `rooms_categories`, `services_categories`, `movies_categories`

When `module_id` is provided, the system:
1. Uses `ModuleService` to get module information
2. Maps module to appropriate indices
3. Searches only relevant indices (or all if no module_id)

---

## Testing

Use the Postman collection (`postman_collection.json`) to test all endpoints:

1. **Suggest Endpoints**:
   - Module ID only
   - Module ID + Store ID
   - Module ID + Category ID
   - All modules (no filters)

2. **Items Endpoints**:
   - Module ID only
   - Store ID only
   - Category ID only (with module_id)
   - Combined filters
   - Semantic search
   - Geo location search

3. **Stores Endpoints**:
   - Module ID only
   - Module ID + Category ID
   - Category ID only (with module_id)
   - Geo location search

4. **Error Cases**:
   - Category ID without Module ID (should return 400)
   - Invalid Module ID (should return empty results)
   - Invalid Category ID (should return 400)

---

## Key Features

1. **Flexible Filtering**: Supports module, store, and category filters independently or combined
2. **Enhanced Search**: Searches by name, category, and store/item relationships
3. **Validation**: Ensures data integrity with proper validation rules
4. **Semantic Search**: Optional vector-based search for better relevance
5. **Geo Support**: Distance calculation and sorting
6. **Analytics**: Comprehensive search event logging
7. **Fallback Mechanisms**: Graceful degradation when enhanced search fails

---

## Migration from Legacy Endpoints

| Legacy Endpoint | V2 Equivalent |
|----------------|---------------|
| `/search/food?q=misal` | `/v2/search/items?q=misal&module_id=4` |
| `/search/food/stores?q=misal` | `/v2/search/stores?q=misal&module_id=4` |
| `/search/food/suggest?q=misal` | `/v2/search/suggest?q=misal&module_id=4` |
| `/search/ecom?q=milk` | `/v2/search/items?q=milk&module_id=5` |

Note: Module IDs are database-driven. Common mappings:
- Module 4 = Food
- Module 5 = E-commerce
- (Check `modules` table for actual mappings)

