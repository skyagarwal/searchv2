# 📚 MODULE-AWARE SEARCH API - SWAGGER DOCUMENTATION

**Version**: 2.0.0  
**Date**: November 10, 2025  
**Architecture**: Option C - Unified Search with Module Filters  
**Base URL**: `http://localhost:3100`

---

## 📖 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Module System](#module-system)
4. [API Endpoints](#api-endpoints)
   - [Unified Search](#1-unified-search)
   - [Module-Specific Search](#2-module-specific-search)
   - [Global Search](#3-global-search)
   - [Semantic Search](#4-semantic-search)
   - [Category Search](#5-category-search)
   - [Suggestions](#6-suggestions--autocomplete)
   - [AI Agent](#7-ai-agent-search)
5. [Common Parameters](#common-parameters)
6. [Response Formats](#response-formats)
7. [Error Handling](#error-handling)
8. [Examples](#examples)

---

## 🎯 OVERVIEW

The Module-Aware Search API provides comprehensive search capabilities across multiple modules (Food, Shop, Pet Care, etc.) with support for:

- ✅ **Unified Search**: Single endpoint for all module searches
- ✅ **Module Filtering**: Search specific modules or module types
- ✅ **Cross-Module Search**: Search across multiple modules simultaneously
- ✅ **Semantic Search**: AI-powered vector similarity search
- ✅ **Geo-Spatial Search**: Location-based filtering and sorting
- ✅ **Category-Scoped Search**: Module-aware category filtering
- ✅ **Smart Suggestions**: Autocomplete with module context
- ✅ **AI Agent**: Natural language search with clarification

---

## 🔐 AUTHENTICATION

Currently, the API is open. Future versions may require:
- API Key in header: `X-API-Key: your-api-key`
- JWT Token: `Authorization: Bearer <token>`

---

## 🏗️ MODULE SYSTEM

### Active Modules

| ID | Module Name | Type | Stores | Items | Description |
|----|-------------|------|--------|-------|-------------|
| **4** | Food | food | 219 | 11,395 | Restaurants & food delivery |
| **5** | Shop | ecommerce | 26 | 1,008 | E-commerce products |
| **13** | Pet Care | ecommerce | 20 | 0 | Pet supplies & services |
| **3** | Local Delivery | parcel | 0 | 0 | Parcel delivery service |
| **14** | Ambulance | parcel | 0 | 0 | Emergency ambulance service |
| **17** | Fruits & Vegetables | grocery | 0 | 0 | Fresh produce |

### Module Types

- `food` - Food delivery modules
- `ecommerce` - E-commerce/shopping modules
- `grocery` - Grocery delivery modules
- `parcel` - Delivery/logistics modules
- `pharmacy` - Pharmacy/medicine modules

**Important**: Category IDs are NOT unique globally - they are scoped to modules. Always provide `module_id` when searching by category.

---

## 🚀 API ENDPOINTS

### 1. UNIFIED SEARCH

**The main search endpoint supporting all filtering options.**

```http
GET /search
```

#### Request Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `q` | string | ✅ Yes | Search query | `pizza` |
| `module_id` | number | ❌ No | Specific module instance | `4` |
| `module_ids` | string | ❌ No | Multiple modules (comma-separated) | `4,5,13` |
| `module_type` | string | ❌ No | All modules of type | `food` |
| `category_id` | number | ❌ No | Category filter (requires module context) | `288` |
| `lat` | number | ❌ No | User latitude | `19.9975` |
| `lon` | number | ❌ No | User longitude | `73.7898` |
| `radius_km` | number | ❌ No | Search radius | `5` |
| `zone_id` | number | ❌ No | Zone filter | `4` |
| `semantic` | boolean | ❌ No | Enable vector search | `false` |
| `veg` | boolean | ❌ No | Vegetarian filter | `true` |
| `price_min` | number | ❌ No | Minimum price | `100` |
| `price_max` | number | ❌ No | Maximum price | `500` |
| `rating_min` | number | ❌ No | Minimum rating (1-5) | `4.0` |
| `page` | number | ❌ No | Page number | `1` |
| `size` | number | ❌ No | Results per page (max 100) | `20` |
| `sort` | string | ❌ No | Sort order | `distance` |

**Sort Options**: `distance`, `price_asc`, `price_desc`, `rating`, `popularity`

#### Response Schema

```typescript
{
  "query": "pizza",
  "modules": [
    {
      "id": 4,
      "name": "Food",
      "type": "food",
      "status": 1,
      "icon": "https://..."
    }
  ],
  "items": [
    {
      "id": 456,
      "name": "Margherita Pizza",
      "description": "Classic Italian pizza with fresh basil",
      "price": 299,
      "store_id": 123,
      "module_id": 4,
      "category_id": 288,
      "avg_rating": 4.7,
      "order_count": 500,
      "veg": true,
      "image": "https://...",
      "distance": 2.5,
      "store": {
        "id": 123,
        "name": "Pizza Paradise",
        "module_id": 4,
        "zone_id": 4,
        "latitude": 19.9975,
        "longitude": 73.7898,
        "avg_rating": 4.5,
        "delivery_time": 30
      },
      "module": {
        "id": 4,
        "name": "Food",
        "type": "food"
      },
      "category": {
        "id": 288,
        "name": "Italian",
        "module_id": 4
      }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "size": 20,
    "total_pages": 8,
    "by_module": {
      "4": { "count": 120, "name": "Food" },
      "5": { "count": 30, "name": "Shop" }
    },
    "took": 45
  },
  "facets": {
    "modules": [
      { "id": 4, "name": "Food", "type": "food", "count": 120 },
      { "id": 5, "name": "Shop", "type": "ecommerce", "count": 30 }
    ],
    "categories": [
      { "id": 288, "name": "Italian", "module_id": 4, "count": 45 }
    ],
    "price_ranges": [
      { "min": 0, "max": 100, "count": 25 },
      { "min": 100, "max": 500, "count": 80 }
    ],
    "ratings": [
      { "rating": 5, "count": 30 },
      { "rating": 4, "count": 50 }
    ]
  }
}
```

#### Examples

**Search specific module (Food):**
```bash
GET /search?q=pizza&module_id=4&lat=19.9975&lon=73.7898
```

**Search multiple modules:**
```bash
GET /search?q=healthy&module_ids=4,5,13
```

**Search all food-type modules:**
```bash
GET /search?q=biryani&module_type=food
```

**Search all active modules:**
```bash
GET /search?q=chicken
```

**Category search (MUST include module):**
```bash
GET /search?module_id=4&category_id=288&lat=19.9975&lon=73.7898
```

**Semantic search across modules:**
```bash
GET /search?q=healthy%20breakfast&module_ids=4,5&semantic=1
```

---

### 2. MODULE-SPECIFIC SEARCH

**Backward-compatible endpoints for module-type based search.**

#### 2.1 Food Module Search

```http
GET /search/food
```

**Parameters**: Same as unified search (excluding module filters)

**Example**:
```bash
GET /search/food?q=biryani&veg=false&lat=19.9975&lon=73.7898
```

#### 2.2 Ecommerce Module Search

```http
GET /search/ecom
```

**Searches both Shop (module 5) and Pet Care (module 13).**

**Example**:
```bash
# Search all ecommerce modules
GET /search/ecom?q=milk

# Search specific ecommerce module (Shop)
GET /search/ecom?module_id=5&q=milk

# Search specific ecommerce module (Pet Care)
GET /search/ecom?module_id=13&q=dog%20food
```

#### 2.3 Grocery Module Search

```http
GET /search/grocery
```

**Example**:
```bash
GET /search/grocery?q=vegetables&module_id=17
```

#### 2.4 Parcel Module Search

```http
GET /search/parcel
```

**Example**:
```bash
GET /search/parcel?module_id=3  # Local Delivery
GET /search/parcel?module_id=14 # Ambulance
```

#### 2.5 Pharmacy Module Search

```http
GET /search/pharmacy
```

**Example**:
```bash
GET /search/pharmacy?q=medicine
```

---

### 3. GLOBAL SEARCH

**Search across ALL active modules with grouped results.**

```http
GET /search/all
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ Yes | Search query |
| `lat` | number | ❌ No | User latitude |
| `lon` | number | ❌ No | User longitude |
| `radius_km` | number | ❌ No | Search radius |
| `semantic` | boolean | ❌ No | Enable vector search |
| `page` | number | ❌ No | Page number |
| `size` | number | ❌ No | Results per page |
| `sort` | string | ❌ No | Sort order |

#### Response Schema

```typescript
{
  "query": "healthy",
  "modules_searched": ["Food", "Shop", "Pet Care", "Grocery"],
  "results_by_module": {
    "Food": {
      "module_id": 4,
      "count": 45,
      "items": [ /* ItemDto[] */ ]
    },
    "Shop": {
      "module_id": 5,
      "count": 12,
      "items": [ /* ItemDto[] */ ]
    },
    "Pet Care": {
      "module_id": 13,
      "count": 8,
      "items": [ /* ItemDto[] */ ]
    }
  },
  "total_results": 65,
  "meta": {
    "total": 65,
    "page": 1,
    "size": 20,
    "total_pages": 4,
    "took": 67
  }
}
```

#### Example

```bash
GET /search/all?q=chicken&lat=19.9975&lon=73.7898&radius_km=5
```

---

### 4. SEMANTIC SEARCH

**AI-powered vector similarity search using embeddings.**

```http
GET /search/semantic
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ Yes | Natural language query |
| `module_id` | number | ❌ No | Specific module |
| `module_ids` | string | ❌ No | Multiple modules |
| `module_type` | string | ❌ No | Module type |
| `lat` | number | ❌ No | User latitude |
| `lon` | number | ❌ No | User longitude |
| `zone_id` | number | ❌ No | Zone filter |
| `size` | number | ❌ No | Results count |

#### Response Schema

```typescript
{
  "query": "healthy breakfast options",
  "semantic": true,
  "items": [
    {
      "id": 123,
      "name": "Healthy Oats Bowl",
      "description": "Nutritious oats with fresh fruits",
      "module": {
        "id": 4,
        "name": "Food",
        "type": "food"
      },
      "similarity_score": 0.92,  // Higher = more similar
      "price": 150,
      "avg_rating": 4.8,
      // ... other fields
    },
    {
      "id": 456,
      "name": "Organic Breakfast Cereal",
      "module": {
        "id": 5,
        "name": "Shop",
        "type": "ecommerce"
      },
      "similarity_score": 0.88,
      // ... other fields
    }
  ],
  "meta": {
    "total": 20,
    "page": 1,
    "size": 20,
    "took": 120
  }
}
```

#### Examples

**Semantic search in specific module:**
```bash
GET /search/semantic?q=healthy%20breakfast%20options&module_id=4
```

**Cross-module semantic search:**
```bash
GET /search/semantic?q=nutritious%20food%20for%20dogs&module_ids=4,13
```

**Semantic search all food modules:**
```bash
GET /search/semantic?q=spicy%20dishes&module_type=food
```

---

### 5. CATEGORY SEARCH

**Browse items within a specific category.**

```http
GET /search/category
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category_id` | number | ✅ Yes | Category ID |
| `module_id` | number | ✅ Yes | Module ID (REQUIRED) |
| `lat` | number | ❌ No | User latitude |
| `lon` | number | ❌ No | User longitude |
| `zone_id` | number | ❌ No | Zone filter |
| `veg` | boolean | ❌ No | Vegetarian filter |
| `page` | number | ❌ No | Page number |
| `size` | number | ❌ No | Results per page |

#### Response Schema

Same as unified search response.

#### Examples

**Browse Food module category:**
```bash
GET /search/category?module_id=4&category_id=288
```

**Browse with geo-filtering:**
```bash
GET /search/category?module_id=4&category_id=288&lat=19.9975&lon=73.7898&zone_id=4
```

**Alternative endpoints (backward compatible):**
```bash
GET /search/food/category?module_id=4&category_id=288
GET /search/ecom/category?module_id=5&category_id=25
```

---

### 6. SUGGESTIONS / AUTOCOMPLETE

**Get search suggestions as user types.**

```http
GET /search/suggest
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ Yes | Partial query (min 2 chars) |
| `module_id` | number | ❌ No | Specific module |
| `module_ids` | string | ❌ No | Multiple modules |
| `size` | number | ❌ No | Suggestions count (default: 10) |

#### Response Schema

```typescript
{
  "query": "chi",
  "suggestions": {
    "items": [
      {
        "text": "Chicken Biryani",
        "module": "Food",
        "module_id": 4,
        "id": 456,
        "type": "item"
      },
      {
        "text": "Chicken Masala",
        "module": "Food",
        "module_id": 4,
        "id": 789,
        "type": "item"
      },
      {
        "text": "Chicken Food (Dog)",
        "module": "Pet Care",
        "module_id": 13,
        "id": 101,
        "type": "item"
      }
    ],
    "stores": [
      {
        "text": "Chicken Palace",
        "module": "Food",
        "module_id": 4,
        "id": 123,
        "type": "store"
      }
    ],
    "categories": [
      {
        "text": "Chicken Items",
        "module": "Food",
        "module_id": 4,
        "category_id": 145,
        "type": "category"
      }
    ]
  }
}
```

#### Examples

**Module-specific suggestions:**
```bash
GET /search/suggest?q=chi&module_id=4
```

**Multi-module suggestions:**
```bash
GET /search/suggest?q=dog&module_ids=4,13
```

**Global suggestions (all modules):**
```bash
GET /search/suggest/all?q=hea
```

**Alternative endpoints:**
```bash
GET /search/food/suggest?q=piz&module_id=4
GET /search/ecom/suggest?q=milk&module_id=5
```

---

### 7. AI AGENT SEARCH

**Natural language search with intelligent module selection and clarification.**

```http
GET /search/agent
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | ✅ Yes | Natural language query |
| `lat` | number | ❌ No | User latitude (context) |
| `lon` | number | ❌ No | User longitude (context) |
| `zone_id` | number | ❌ No | User zone (context) |
| `context` | string | ❌ No | Conversation context ID |

#### Response Schemas

**Scenario A: Direct Results**

```typescript
{
  "results": {
    "query": "show me healthy breakfast options",
    "modules": [
      { "id": 4, "name": "Food", "type": "food" }
    ],
    "items": [ /* ItemDto[] */ ],
    "meta": { /* SearchMetaDto */ }
  }
}
```

**Scenario B: Clarification Request**

```typescript
{
  "clarification": {
    "type": "clarification",
    "question": "I found 'milk' in 2 categories. Which would you like?",
    "options": [
      {
        "module_id": 4,
        "module_name": "Food",
        "suggested_query": "Search in Food module (Milk Shakes, Milk Tea)"
      },
      {
        "module_id": 5,
        "module_name": "Shop",
        "suggested_query": "Search in Shop module (Dairy Products)"
      }
    ]
  }
}
```

#### Examples

**Simple query:**
```bash
GET /search/agent?q=show%20me%20pizza%20near%20me&lat=19.9975&lon=73.7898
```

**Ambiguous query (triggers clarification):**
```bash
GET /search/agent?q=I%20need%20milk
```

**Follow-up with context:**
```bash
GET /search/agent?q=show%20me%20the%20best%20ones&context=prev_search_123
```

---

## 📊 COMMON PARAMETERS

### Pagination

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | 1 | - | Page number (1-indexed) |
| `size` | number | 20 | 100 | Results per page |

### Geo-Spatial

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `lat` | number | User latitude | `19.9975` |
| `lon` | number | User longitude | `73.7898` |
| `radius_km` | number | Search radius in km | `5` |

### Filtering

| Parameter | Type | Description |
|-----------|------|-------------|
| `veg` | boolean | Vegetarian items only |
| `price_min` | number | Minimum price filter |
| `price_max` | number | Maximum price filter |
| `rating_min` | number | Minimum rating (1-5) |
| `zone_id` | number | Delivery zone filter |

### Sorting

| Value | Description |
|-------|-------------|
| `distance` | Nearest first (requires lat/lon) |
| `price_asc` | Lowest price first |
| `price_desc` | Highest price first |
| `rating` | Highest rated first |
| `popularity` | Most ordered first |

---

## 📦 RESPONSE FORMATS

### Success Response (200 OK)

All successful searches return:
- `query`: Original search query
- `items`: Array of matching items
- `meta`: Pagination and count metadata
- `modules`: Modules that were searched
- `facets`: (Optional) Aggregations for filtering

### Error Responses

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "category_id requires module_id or module_ids",
  "error": "Bad Request",
  "timestamp": "2025-11-10T10:30:00.000Z",
  "path": "/search"
}
```

**Common Causes:**
- Missing required parameters
- Invalid parameter values
- Category search without module context

#### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Module with ID 99 not found",
  "error": "Not Found"
}
```

**Common Causes:**
- Invalid module_id
- Inactive module
- Module not in user's zone

#### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## 💡 EXAMPLES

### Use Case 1: Mobile App Food Tab

**User opens Food tab and searches "biryani":**

```bash
GET /search?q=biryani&module_id=4&lat=19.9975&lon=73.7898&sort=distance
```

### Use Case 2: AI Chat - Healthy Items

**User asks: "Show me healthy items"**

AI searches across Food, Shop, and Grocery modules:

```bash
GET /search?q=healthy&module_ids=4,5,17&semantic=1
```

### Use Case 3: Category Browsing

**User browses "Italian" category in Food module:**

```bash
GET /search/category?module_id=4&category_id=288&zone_id=4
```

### Use Case 4: Cross-Module Search

**User searches "chicken" across all modules:**

```bash
GET /search/all?q=chicken&lat=19.9975&lon=73.7898
```

Returns:
- Food: Chicken Biryani, Chicken Curry
- Shop: Frozen Chicken
- Pet Care: Chicken-flavored Dog Food

### Use Case 5: Autocomplete

**User types "piz" in Food module:**

```bash
GET /search/suggest?q=piz&module_id=4&size=5
```

Returns suggestions: Pizza, Pizza Margherita, Pizza Paradise (store), etc.

### Use Case 6: Semantic Search

**User searches: "quick breakfast options for busy mornings"**

```bash
GET /search/semantic?q=quick%20breakfast%20options%20for%20busy%20mornings&module_id=4&size=10
```

AI finds semantically similar items even if they don't contain exact keywords.

---

## 🔧 INTEGRATION GUIDE

### JavaScript/TypeScript

```typescript
const searchAPI = {
  baseURL: 'http://localhost:3100',
  
  async search(params: {
    q: string;
    module_id?: number;
    lat?: number;
    lon?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${this.baseURL}/search?${query}`);
    return response.json();
  },
  
  async suggest(q: string, module_id?: number) {
    const params = new URLSearchParams({ q });
    if (module_id) params.append('module_id', module_id.toString());
    const response = await fetch(`${this.baseURL}/search/suggest?${params}`);
    return response.json();
  }
};

// Usage
const results = await searchAPI.search({
  q: 'pizza',
  module_id: 4,
  lat: 19.9975,
  lon: 73.7898
});
```

### Python

```python
import requests

class SearchAPI:
    BASE_URL = "http://localhost:3100"
    
    def search(self, q, module_id=None, lat=None, lon=None):
        params = {"q": q}
        if module_id:
            params["module_id"] = module_id
        if lat:
            params["lat"] = lat
        if lon:
            params["lon"] = lon
            
        response = requests.get(f"{self.BASE_URL}/search", params=params)
        return response.json()

# Usage
api = SearchAPI()
results = api.search(q="pizza", module_id=4, lat=19.9975, lon=73.7898)
```

### cURL

```bash
# Simple search
curl "http://localhost:3100/search?q=pizza&module_id=4"

# With authentication (future)
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3100/search?q=pizza&module_id=4"
```

---

## 📈 PERFORMANCE TIPS

1. **Use Module Filters**: Always specify `module_id` or `module_type` to reduce search scope
2. **Limit Results**: Use reasonable `size` values (default 20, max 100)
3. **Cache Suggestions**: Client-side cache for autocomplete to reduce API calls
4. **Use Semantic Search Wisely**: Vector search is slower - use for complex queries only
5. **Geo-Filtering**: Provide `lat`/`lon` for better relevance and faster distance sorting

---

## 🚀 NEXT STEPS

1. Review this documentation
2. Test endpoints using provided examples
3. Integrate into mobile app / web frontend
4. Set up error handling for edge cases
5. Monitor API performance and optimize queries

**Ready to implement? Let's build! 🎉**
