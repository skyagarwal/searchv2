# Search API Integration Guide for Mangwale AI

This document provides a comprehensive guide for integrating the Mangwale AI (NLU/LLM) with the Search Service. The Search Service acts as a **Retriever** and **Tool** provider for the AI system.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Base Configuration](#base-configuration)
3. [Integration Patterns](#integration-patterns)
4. [API Reference](#api-reference)
5. [Filter Logic Deep Dive](#filter-logic-deep-dive)
6. [Zone & Radius Logic](#zone--radius-logic)
7. [Response Structure](#response-structure)
8. [Error Handling](#error-handling)
9. [OpenAPI/Tool Definitions](#openapitool-definitions)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MANGWALE AI SYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐ │
│  │   User Chat  │───▶│  NLU/LLM     │───▶│   Tool Calling /      │ │
│  │   Interface  │    │  (Your AI)   │    │   RAG Retrieval       │ │
│  └──────────────┘    └──────────────┘    └───────────┬───────────┘ │
│                                                      │              │
└──────────────────────────────────────────────────────┼──────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SEARCH SERVICE (This API)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SEARCH ENDPOINTS                          │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│   │
│  │  │  /v2/search │ │  /search/   │ │  /search/agent          ││   │
│  │  │  /items     │ │  semantic/* │ │  (Natural Language)     ││   │
│  │  │  /stores    │ │  (Vector)   │ │                         ││   │
│  │  │  /suggest   │ │             │ │                         ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────┼─────────────────────────────────┐   │
│  │                    FILTER LAYERS                             │   │
│  │  ┌─────────────┐ ┌───────┴───────┐ ┌─────────────────────┐  │   │
│  │  │  Zone       │ │  Radius       │ │  Module/Category    │  │   │
│  │  │  (Polygon)  │ │  (Geo Circle) │ │  (module_id, veg)   │  │   │
│  │  └─────────────┘ └───────────────┘ └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────┼─────────────────────────────────┐   │
│  │                    DATA SOURCES                              │   │
│  │  ┌─────────────┐ ┌───────┴───────┐ ┌─────────────────────┐  │   │
│  │  │ OpenSearch  │ │    MySQL      │ │  Embedding Service  │  │   │
│  │  │ (Indices)   │ │  (Zones, DB)  │ │  (Vector Gen)       │  │   │
│  │  └─────────────┘ └───────────────┘ └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Base Configuration

| Key | Value |
|-----|-------|
| **Base URL** | `http://localhost:3100` (Replace with production host) |
| **Response Format** | JSON |
| **API Docs** | `http://localhost:3100/api-docs` (Swagger UI) |

---

## Integration Patterns

### Pattern 1: RAG (Retrieval-Augmented Generation)
Use **Semantic Search** endpoints to retrieve relevant items based on natural language queries.

**Workflow:**
```
User: "I'm looking for something spicy and cheesy for dinner"
   │
   ▼
Your NLU: Parse intent → "search for food items"
   │
   ▼
Tool Call: GET /search/semantic/food?q=spicy%20cheesy&lat=19.99&lon=73.78
   │
   ▼
Search API Returns: [
  { name: "Spicy Cheese Pizza", price: 299, store_name: "Pizza Hub" },
  { name: "Jalapeno Poppers", price: 199, store_name: "Snack Corner" }
]
   │
   ▼
Your LLM: Generate response using retrieved items as context
   │
   ▼
Response: "I found some great options for you! There's Spicy Cheese Pizza at Pizza Hub for ₹299..."
```

### Pattern 2: Tool Use (Function Calling)
If your LLM supports function calling (OpenAI, Anthropic, etc.), define tools corresponding to API endpoints.

**Recommended Tools:**
1. `search_items` → `/v2/search/items`
2. `search_stores` → `/v2/search/stores`
3. `search_suggestions` → `/v2/search/suggest`
4. `semantic_search` → `/search/semantic/{module}`
5. `agent_search` → `/search/agent` (Full NL parsing)

### Pattern 3: Agent Search (Built-in NLU)
Use `/search/agent` for queries requiring complex parsing. This endpoint has **built-in NLU** that:
- Detects module (food, ecom, rooms, services, movies)
- Extracts filters (veg, price range, rating)
- Resolves store names to IDs
- Applies progressive relaxation if no results

**Example:**
```http
GET /search/agent?q=go%20to%20ganesh%20sweets%20and%20order%20paneer&lat=19.99&lon=73.78
```

**Response:**
```json
{
  "plan": {
    "module": "food",
    "target": "items",
    "q": "paneer",
    "store_name": "ganesh sweets",
    "store_id": "13",
    "store_name_found": "Ganesh Sweet Mart",
    "veg": true
  },
  "result": {
    "items": [...],
    "meta": { "total": 5 }
  }
}
```

---

## API Reference

### A. Semantic Search (Vector Retrieval)
*Best for vague, descriptive, or concept-based queries.*

**Endpoint:** `GET /search/semantic/{module}`
- **Modules:** `food`, `ecom`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | **Yes** | Natural language query |
| `lat` | float | No | User's latitude |
| `lon` | float | No | User's longitude |
| `radius_km` | int | No | Search radius in km |
| `size` | int | No | Results per page (default: 20, max: 100) |
| `veg` | string | No | `1`=veg, `0`=non-veg |
| `category_id` | int | No | Filter by category |
| `price_min` | int | No | Minimum price |
| `price_max` | int | No | Maximum price |
| `store_id` | int | No | Filter to specific store |

**Example:**
```http
GET /search/semantic/food?q=healthy%20breakfast%20options&lat=19.9975&lon=73.7898
```

---

### B. Structured Item Search (V2) — RECOMMENDED
*Best for specific queries with filters.*

**Endpoint:** `GET /v2/search/items`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search keywords |
| `module_id` | int | No | Module filter (4=Food, 5=E-com) |
| `store_id` | int | No | Filter to specific store |
| `category_id` | int | No | Filter by category (requires `module_id`) |
| `veg` | string | No | `1`=veg, `0`=non-veg, omit=all |
| `price_min` | int | No | Minimum price |
| `price_max` | int | No | Maximum price |
| `rating_min` | int | No | Minimum rating (0-5) |
| `lat` | float | No | User's latitude |
| `lon` | float | No | User's longitude |
| `radius_km` | int | No | Radius filter in km |
| `page` | int | No | Page number (1-based) |
| `size` | int | No | Results per page (default: 20) |
| `sort` | string | No | `distance`, `price_asc`, `price_desc`, `rating`, `popularity` |
| `semantic` | string | No | `1`=use vector search |

**Example:**
```http
GET /v2/search/items?q=pizza&module_id=4&veg=1&price_max=300&lat=19.9975&lon=73.7898&sort=distance
```

---

### C. Store Search (V2)
*Best for finding restaurants/shops.*

**Endpoint:** `GET /v2/search/stores`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Store name or keyword |
| `module_id` | int | No | Module filter |
| `category_id` | int | No | Find stores serving items in this category (requires `module_id`) |
| `lat` | float | No | User's latitude |
| `lon` | float | No | User's longitude |
| `radius_km` | int | No | Radius filter in km |
| `page` | int | No | Page number |
| `size` | int | No | Results per page |
| `sort` | string | No | `distance`, `popularity` |

**Example:**
```http
GET /v2/search/stores?q=pizza&module_id=4&lat=19.9975&lon=73.7898
```

---

### D. Suggestions (Autocomplete)
*For typeahead/autocomplete functionality.*

**Endpoint:** `GET /v2/search/suggest`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | **Yes** | Query (min 2 chars) |
| `module_id` | int | No | Filter by module |
| `store_id` | int | No | Filter to store |
| `lat` | float | No | For distance calculation |
| `lon` | float | No | For distance calculation |
| `size` | int | No | Max suggestions (default: 5) |

**Response includes:**
- `items[]` — Matching items
- `stores[]` — Matching stores
- `categories[]` — Matching categories

---

### E. Agent Search (Natural Language)
*For complex natural language queries with built-in NLU.*

**Endpoint:** `GET /search/agent`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Free-form natural language query |
| `lat` | float | No | User's latitude |
| `lon` | float | No | User's longitude |
| `radius_km` | int | No | Default radius |

**Capabilities:**
- Detects module: `"order pizza"` → food, `"buy milk"` → ecom
- Extracts filters: `"veg pizza under 300"` → veg=1, price_max=300
- Resolves stores: `"go to Dominos"` → store_id=123
- Progressive relaxation: If 0 results, drops filters one by one

---

## Filter Logic Deep Dive

### Priority & Combination

```
Filters Applied in Order:
1. module_id       → Restricts to specific module(s)
2. store_id        → Restricts to specific store
3. category_id     → Restricts to category + child categories
4. zone_id         → (Stores only) Geo polygon validation
5. radius_km       → (With lat/lon) Geo circle filter
6. veg             → Vegetarian filter
7. price_min/max   → Price range
8. rating_min      → Minimum rating
```

### Filter Behavior

| Filter | Items | Stores | Notes |
|--------|-------|--------|-------|
| `module_id` | ✅ | ✅ | Maps to specific index |
| `store_id` | ✅ | ✅ | Exact match |
| `category_id` | ✅ | ✅ (via items) | Includes child categories |
| `zone_id` | ❌ | ✅ | Auto-detected from lat/lon |
| `radius_km` | ✅ | ✅ | Requires lat/lon |
| `veg` | ✅ | ❌ | 1=veg, 0=non-veg |
| `price_min/max` | ✅ | ❌ | Range filter |
| `rating_min` | ✅ | ❌ | Minimum rating |

### Fallback Logic (Progressive Relaxation)

If search returns 0 results, the system automatically retries:
1. Remove `radius_km` filter (keep sorting by distance)
2. Remove `veg` filter
3. Remove `rating_min`, `price_min`, `price_max`

This is enabled for:
- `/search/agent` endpoint
- `/v2/search/items` (radius fallback only)

---

## Zone & Radius Logic

### Zone Filtering (For Stores)

Zones are geographic polygons stored in MySQL. When `lat`/`lon` are provided:

1. **Zone Detection**: System checks which zone polygon contains the point
2. **Zone Filter**: Adds `zone_id` filter to store queries
3. **Result**: Only stores in the user's zone are returned

**Zone Logic:**
```
User Location (lat, lon) 
    │
    ▼
┌───────────────────────────────┐
│  Point-in-Polygon Algorithm  │
│  (Ray Casting)               │
└───────────────┬───────────────┘
                │
                ▼
        ┌───────────────┐
        │   zone_id     │ ─── Applied to store queries
        └───────────────┘
```

**Note:** Zone filtering is **only applied to stores**, not items (items don't have `zone_id` indexed).

### Radius Filtering (For Items & Stores)

Radius filtering uses OpenSearch's `geo_distance` query:

```
User Location (lat, lon) + radius_km
    │
    ▼
┌───────────────────────────────────────────┐
│  geo_distance: {                          │
│    distance: "10km",                      │
│    store_location: { lat: 19.99, lon: 73.78 } │
│  }                                        │
└───────────────────────────────────────────┘
    │
    ▼
Only items/stores within 10km circle returned
```

**Behavior:**
- If `radius_km` is provided: Hard filter (only results within radius)
- If only `lat`/`lon` (no radius): Results sorted by distance, no hard filter
- Fallback: If 0 results with radius, retry without radius (sort by distance)

### Distance Calculation

Distance is calculated using the **Haversine formula**:

```javascript
distance_km = R * c
where:
  R = 6371 km (Earth's radius)
  c = 2 * atan2(sqrt(a), sqrt(1-a))
  a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
```

Returned in response as `distance_km` field.

### Delivery Time Recalculation

When distance is calculated, delivery times are updated:
```
Original delivery_time: "30-40 min"
Distance: 5 km
Travel time: 5 km / 30 km/h * 60 = 10 min
New delivery_time: "40-50 min"
```

---

## Response Structure

### Items Response

```json
{
  "q": "pizza",
  "filters": {
    "module_id": 4,
    "veg": "1",
    "lat": 19.9975,
    "lon": 73.7898
  },
  "items": [
    {
      "id": "123",
      "name": "Veg Margherita Pizza",
      "slug": "veg-margherita-pizza",
      "price": 299,
      "description": "Classic cheese pizza with fresh basil",
      "image": "https://...",
      "veg": true,
      "category_id": 101,
      "category_name": "Pizzas",
      "store_id": 10,
      "store_name": "Pizza Hub",
      "store_location": { "lat": 19.998, "lon": 73.789 },
      "avg_rating": 4.5,
      "order_count": 1250,
      "distance_km": 2.3,
      "delivery_time": "35-45 min",
      "module_id": 4,
      "score": 15.5
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "size": 20,
    "total_pages": 8,
    "has_more": true
  }
}
```

### Stores Response

```json
{
  "q": "pizza",
  "filters": {
    "module_id": 4
  },
  "stores": [
    {
      "id": "10",
      "name": "Pizza Hub",
      "slug": "pizza-hub",
      "logo": "https://...",
      "cover_photo": "https://...",
      "address": "2.3km | 123 Main Street, Nashik",
      "location": { "lat": 19.998, "lon": 73.789 },
      "avg_rating": 4.5,
      "rating_count": 320,
      "order_count": 5000,
      "delivery_time": "35-45 min",
      "distance_km": 2.3,
      "active": true,
      "open": 1,
      "veg": false,
      "featured": 1,
      "zone_id": 4,
      "module_id": 4
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "size": 20
  }
}
```

---

## Error Handling

| Status | Description |
|--------|-------------|
| `200 OK` | Success (even if 0 results) |
| `400 Bad Request` | Invalid parameters (e.g., `category_id` without `module_id`) |
| `500 Internal Server Error` | Search engine failure |

**Example Error:**
```json
{
  "statusCode": 400,
  "message": "category_id requires module_id parameter (categories are module-scoped, not globally unique)",
  "error": "Bad Request"
}
```

---

## OpenAPI/Tool Definitions

### For OpenAI Function Calling

```json
{
  "name": "search_items",
  "description": "Search for food items, groceries, or products. Use when user wants to find something to order or buy.",
  "parameters": {
    "type": "object",
    "properties": {
      "q": {
        "type": "string",
        "description": "Search query (e.g., 'pizza', 'healthy breakfast')"
      },
      "module_id": {
        "type": "integer",
        "description": "Module ID: 4=Food, 5=Grocery/E-commerce",
        "enum": [4, 5]
      },
      "veg": {
        "type": "string",
        "description": "Vegetarian filter: '1'=veg only, '0'=non-veg only",
        "enum": ["1", "0"]
      },
      "price_max": {
        "type": "integer",
        "description": "Maximum price"
      },
      "lat": {
        "type": "number",
        "description": "User's latitude"
      },
      "lon": {
        "type": "number",
        "description": "User's longitude"
      },
      "radius_km": {
        "type": "integer",
        "description": "Search radius in kilometers"
      }
    },
    "required": []
  }
}
```

```json
{
  "name": "search_stores",
  "description": "Search for restaurants, shops, or stores. Use when user wants to find a specific place to order from.",
  "parameters": {
    "type": "object",
    "properties": {
      "q": {
        "type": "string",
        "description": "Store name or keyword (e.g., 'Dominos', 'grocery store')"
      },
      "module_id": {
        "type": "integer",
        "description": "Module ID: 4=Food, 5=Grocery/E-commerce",
        "enum": [4, 5]
      },
      "category_id": {
        "type": "integer",
        "description": "Find stores serving items from this category"
      },
      "lat": {
        "type": "number",
        "description": "User's latitude"
      },
      "lon": {
        "type": "number",
        "description": "User's longitude"
      }
    },
    "required": []
  }
}
```

```json
{
  "name": "semantic_search",
  "description": "Vector-based semantic search for finding items by meaning. Best for descriptive or vague queries like 'something spicy and cheesy'.",
  "parameters": {
    "type": "object",
    "properties": {
      "module": {
        "type": "string",
        "description": "Module type",
        "enum": ["food", "ecom"]
      },
      "q": {
        "type": "string",
        "description": "Natural language query describing what user wants"
      },
      "lat": {
        "type": "number",
        "description": "User's latitude"
      },
      "lon": {
        "type": "number",
        "description": "User's longitude"
      }
    },
    "required": ["module", "q"]
  }
}
```

---

## Module IDs Reference

| module_id | Name | Type | Index Prefix |
|-----------|------|------|--------------|
| **4** | Food | food | `food_*` |
| **5** | Shop / Grocery | ecommerce | `ecom_*` |
| **6** | Pharmacy | pharmacy | `pharmacy_*` |
| **7** | Parcel | parcel | `parcel_*` |

*(Check `modules` table in MySQL for complete list)*

---

## Quick Start Examples

### 1. User wants pizza nearby
```http
GET /v2/search/items?q=pizza&module_id=4&lat=19.9975&lon=73.7898&radius_km=5&sort=distance
```

### 2. User wants veg food under ₹300
```http
GET /v2/search/items?module_id=4&veg=1&price_max=300&lat=19.9975&lon=73.7898
```

### 3. User says "go to Ganesh Sweets and order paneer"
```http
GET /search/agent?q=go%20to%20ganesh%20sweets%20and%20order%20paneer&lat=19.9975&lon=73.7898
```

### 4. User looking for "healthy breakfast options"
```http
GET /search/semantic/food?q=healthy%20breakfast%20options&lat=19.9975&lon=73.7898
```

### 5. Find stores that serve biryani
```http
GET /v2/search/stores?q=biryani&module_id=4&lat=19.9975&lon=73.7898&sort=distance
```

---

## Notes for AI Team

1. **Embeddings**: `/search/semantic/*` endpoints handle vectorization internally. Just pass text.

2. **Geo-Location**: Always pass `lat` and `lon` when available for:
   - Distance calculation
   - Zone-based filtering (stores)
   - Delivery time recalculation

3. **Category Scope**: `category_id` is **module-scoped** (not globally unique). Always provide `module_id` with `category_id`.

4. **Zone vs Radius**:
   - **Zone**: Business boundary (polygon) — applied automatically to stores
   - **Radius**: User preference (circle) — optional parameter

5. **Fallback**: If 0 results, system auto-relaxes filters. Check `plan.relaxed` in Agent response.

6. **Rate Limits**: No hard limits currently, but use pagination (`page`, `size`) for large result sets
