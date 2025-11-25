# V2 Search Endpoints Documentation

## Overview

The V2 endpoints provide module_id, store_id, and category_id based search functionality, replacing the module-type based endpoints (`/search/food`, `/search/ecom`, etc.). These endpoints use the ModuleService to intelligently resolve which indices to search based on the provided module_id.

## Endpoints

### 1. `/v2/search/suggest`

**Purpose**: Get autocomplete suggestions for items, stores, and categories.

**Query Parameters**:
- `q` (required): Search query (min 2 characters)
- `module_id` (optional): Filter by module ID
- `store_id` (optional): Filter by store ID
- `category_id` (optional): Filter by category ID (requires module_id)
- `lat` (optional): Latitude for geo sorting
- `lon` (optional): Longitude for geo sorting
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

**Response**:
```json
{
  "q": "misal",
  "items": [
    {
      "id": "123",
      "name": "Misal Pav",
      "price": 50,
      "module_id": 4,
      "store_id": 123
    }
  ],
  "stores": [
    {
      "id": "123",
      "name": "Sadhana Chulivarchi Misal",
      "module_id": 4
    }
  ],
  "categories": [
    {
      "id": "288",
      "name": "Maharashtrian",
      "module_id": 4
    }
  ]
}
```

---

### 2. `/v2/search/items`

**Purpose**: Search for items with enhanced search mechanism (searches by item name, category, and store name).

**Query Parameters**:
- `q` (optional): Search query text
- `module_id` (optional): Filter by module ID
- `store_id` (optional): Filter by store ID
- `category_id` (optional): Filter by category ID (requires module_id)
- `semantic` (optional): Use semantic/vector search (1=enabled)
- `veg` (optional): Veg filter ('1'|'veg' = vegetarian, '0'|'non-veg' = non-veg)
- `price_min` (optional): Minimum price
- `price_max` (optional): Maximum price
- `rating_min` (optional): Minimum rating (0-5)
- `lat` (optional): Latitude for geo-distance
- `lon` (optional): Longitude for geo-distance
- `radius_km` (optional): Radius in kilometers
- `page` (optional): Page number (1-based, default 1)
- `size` (optional): Results per page (1-100, default 20)
- `sort` (optional): Sort order (distance, price_asc, price_desc, rating, popularity)

**Search Mechanism**:
1. **Item name matches**: Searches items directly matching the query
2. **Category matches**: Finds categories matching the query, then returns items in those categories
3. **Store name matches**: Finds stores matching the query, then returns items from those stores
4. **Priority**: name > category > store (with scoring boost)

**Examples**:
```bash
# Module-specific search
GET /v2/search/items?q=misal&module_id=4

# Store name fallback (Sadhana Chulivarchi Misal)
GET /v2/search/items?q=Sadhana+Chulivarchi+Misal&module_id=4
# Returns items from stores matching "Sadhana Chulivarchi Misal"

# Store-specific items
GET /v2/search/items?q=pizza&module_id=4&store_id=123

# Category-specific items
GET /v2/search/items?q=pizza&module_id=4&category_id=288

# Semantic search
GET /v2/search/items?q=spicy+chicken+dish&module_id=4&semantic=1

# With filters
GET /v2/search/items?q=pizza&module_id=4&veg=1&price_min=100&price_max=500&rating_min=4

# Geo-location search
GET /v2/search/items?q=pizza&module_id=4&lat=19.9975&lon=73.7898&radius_km=5&sort=distance
```

**Response**:
```json
{
  "q": "misal",
  "filters": {
    "module_id": 4
  },
  "items": [
    {
      "id": "123",
      "name": "Misal Pav",
      "price": 50,
      "module_id": 4,
      "store_id": 123,
      "store_name": "Sadhana Chulivarchi Misal",
      "distance_km": 2.5,
      "delivery_time": "25-35 min",
      "avg_rating": 4.5,
      "order_count": 500
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "size": 20,
    "total_pages": 3,
    "has_more": true
  }
}
```

---

### 3. `/v2/search/stores`

**Purpose**: Search for stores with enhanced search mechanism (searches stores by name, categories they serve, and items they have).

**Query Parameters**:
- `q` (optional): Search query text
- `module_id` (optional): Filter by module ID
- `category_id` (optional): Filter by category ID (requires module_id) - returns stores that serve items in this category
- `lat` (optional): Latitude for geo-distance
- `lon` (optional): Longitude for geo-distance
- `radius_km` (optional): Radius in kilometers
- `page` (optional): Page number (1-based, default 1)
- `size` (optional): Results per page (1-100, default 20)
- `sort` (optional): Sort order (distance, popularity)

**Search Mechanism**:
1. **Store name matches**: Searches stores directly matching the query
2. **Category matches**: Finds categories matching the query, finds items in those categories, then returns stores that serve those items
3. **Item matches**: Finds items matching the query, then returns stores that have those items
4. **Priority**: name > category > item (with scoring boost)

**Examples**:
```bash
# Module-specific store search (searches stores serving items/categories matching "misal")
GET /v2/search/stores?q=misal&module_id=4

# Category-based store search
GET /v2/search/stores?q=misal&module_id=4&category_id=288
# Returns stores that serve items in category 288, optionally filtered by query "misal"

# All stores in a category
GET /v2/search/stores?module_id=4&category_id=288

# Geo-location search
GET /v2/search/stores?q=pizza&module_id=4&lat=19.9975&lon=73.7898&radius_km=10&sort=distance
```

**Response**:
```json
{
  "q": "misal",
  "filters": {
    "module_id": 4,
    "category_id": 288
  },
  "stores": [
    {
      "id": "123",
      "name": "Sadhana Chulivarchi Misal",
      "module_id": 4,
      "distance_km": 2.5,
      "delivery_time": "25-35 min",
      "avg_rating": 4.5,
      "order_count": 500
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "size": 20,
    "total_pages": 1,
    "has_more": false
  }
}
```

---

## Key Features

### 1. Module-Based Index Resolution
- If `module_id` is provided: Only searches in that module's indices
- If not provided: Searches across all modules
- Uses `ModuleService.resolveModules()` and `ModuleService.getIndicesForModules()`

### 2. Enhanced Search Mechanism
- **Items endpoint**: Searches by item name, category, and store name
- **Stores endpoint**: Searches by store name, categories they serve, and items they have
- Results are merged with priority scoring (name > category > store/item)

### 3. Filtering Logic
- **module_id**: Filters to specific module
- **store_id**: Filters to specific store
- **category_id**: Filters to specific category (requires module_id)
- Multiple filters can be combined (e.g., module_id + store_id + category_id)

### 4. Validation
- `category_id` requires `module_id` (categories are module-scoped)
- Validates that category belongs to module if both provided
- Returns appropriate error messages for invalid combinations

### 5. Fallback Mechanisms
- **Items**: If no items found, searches stores/categories matching query and returns items from those stores
- **Stores**: Always searches by name, category, and items to find all relevant stores

---

## Comparison with Legacy Endpoints

| Legacy Endpoint | V2 Equivalent | Notes |
|----------------|---------------|-------|
| `/search/food?q=misal` | `/v2/search/items?q=misal&module_id=4` | Module 4 = Food |
| `/search/food/stores?q=misal` | `/v2/search/stores?q=misal&module_id=4` | Module 4 = Food |
| `/search/food/suggest?q=misal` | `/v2/search/suggest?q=misal&module_id=4` | Module 4 = Food |
| `/search/ecom?q=milk` | `/v2/search/items?q=milk&module_id=5` | Module 5 = Shop |

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "category_id requires module_id parameter (categories are module-scoped, not globally unique)",
  "error": "Bad Request"
}
```

### 400 Bad Request (Invalid Category)
```json
{
  "statusCode": 400,
  "message": "Category 99999 does not exist in module 4",
  "error": "Bad Request"
}
```

---

## Postman Collection

A comprehensive Postman collection is available at `/srv/SearchMangwaleAi/postman_collection.json` with test cases for:
- All three V2 endpoints
- Various filter combinations
- Error cases
- Geo-location searches
- Pagination
- Semantic search
- Legacy endpoint references

---

## Implementation Details

### Index Resolution Flow
```
Request with module_id=4
    ↓
ModuleService.resolveModules({ module_id: 4 })
    ↓
Returns: [{ id: 4, module_type: 'food', opensearch_index: 'food_items' }]
    ↓
ModuleService.getIndicesForModules(modules, 'items')
    ↓
Returns: ['food_items']
    ↓
Search only in 'food_items' index
```

### Enhanced Search Flow (Items)
```
Query: "Sadhana Chulivarchi Misal"
    ↓
1. Search items by name → 0 results
    ↓
2. Search categories matching "Sadhana Chulivarchi Misal" → 0 results
    ↓
3. Search stores matching "Sadhana Chulivarchi Misal" → Found store ID 123
    ↓
4. Search items from store 123 → Return items
```

### Enhanced Search Flow (Stores)
```
Query: "misal"
    ↓
1. Search stores by name → Found stores
    ↓
2. Search categories matching "misal" → Found category IDs
    ↓
   → Find items in those categories → Get store IDs
    ↓
3. Search items matching "misal" → Get store IDs
    ↓
4. Merge all store results with priority: name > category > item
```

---

## Testing

Use the provided Postman collection or test manually:

```bash
# Test suggest endpoint
curl "https://search.mangwale.ai/v2/search/suggest?q=misal&module_id=4"

# Test items endpoint with store name fallback
curl "https://search.mangwale.ai/v2/search/items?q=Sadhana+Chulivarchi+Misal&module_id=4"

# Test stores endpoint
curl "https://search.mangwale.ai/v2/search/stores?q=misal&module_id=4"
```

---

## Notes

1. **Categories are module-scoped**: Always provide `module_id` when using `category_id`
2. **Index resolution**: The system automatically determines which indices to search based on `module_id`
3. **Performance**: When `module_id` is provided, only relevant indices are searched, improving performance
4. **Backward compatibility**: Legacy endpoints (`/search/food`, etc.) still work but V2 endpoints are recommended

