# AI Integration Guide for Search Service

This document outlines the integration points for AI agents to interact with the Search Service. The service provides semantic search, hyperlocal discovery, and structured filtering capabilities. It acts as a bridge between AI agents and the underlying data layer (OpenSearch + MySQL).

## Base Configuration
- **Base URL**: `http://localhost:3000` (Internal) / `https://api.yourdomain.com` (Public)
- **Authentication**: None (Internal) / Bearer Token (Public)
- **Database**: Configurable via environment variables (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`). Currently defaults to `migrated_db`.

## Key Endpoints for AI Agents

### 1. Natural Language Search Agent
**Endpoint**: `GET /search/agent`
**Purpose**: Best for handling raw user queries like "find me a spicy pizza near mg road". The system parses intent, extracts entities (items, stores, locations), and executes a multi-stage search.

**Parameters**:
- `q` (required): The natural language query.
- `lat` (optional): User's latitude.
- `lon` (optional): User's longitude.
- `radius_km` (optional): Search radius (default: 5km).

**Response**:
```json
{
  "plan": {
    "module": "food",
    "target": "items",
    "intent": "search",
    "filters": { "veg": true }
  },
  "result": {
    "items": [ ... ],
    "meta": { "total": 15 }
  }
}
```

### 2. Semantic Search (Vector)
**Endpoint**: `GET /search/semantic/food`
**Purpose**: Use when the user's intent is abstract or descriptive (e.g., "healthy breakfast options" or "something sweet for dessert"). Uses `all-MiniLM-L6-v2` embeddings (384d).

**Parameters**:
- `q` (required): Query text to be vectorized.
- `lat`, `lon`: For geo-biased semantic search.
- `veg`: `1` (Veg) / `0` (Non-veg).

### 3. Structured Item Search
**Endpoint**: `GET /v2/search/items`
**Purpose**: Use when the AI has already extracted specific filters and wants precise results.

**Parameters**:
- `q`: Keyword search.
- `module_id`: `4` (Food), `5` (Grocery/Ecom).
- `store_id`: Filter by specific store.
- `price_min`, `price_max`: Price range.
- `rating_min`: Minimum rating (0-5).
- `veg`: `1` or `0`.
- `sort`: `distance`, `rating`, `price_asc`, `price_desc`.

## Data Schema & Capabilities

### Index: `food_items`
The system uses OpenSearch with the following key capabilities:

- **Hyperlocal**: `store_location` is a `geo_point` field supporting `geo_distance` filtering and sorting.
- **Semantic**: `combined_vector` (384d) supports k-NN search for meaning-based retrieval.
- **Metadata**:
  - `name`, `description`: Text fields.
  - `price`: Float.
  - `veg`: Boolean.
  - `store_id`: Integer (Link to Store).
  - `available_time_starts/ends`: Time windows for availability.

## Client-Side Configuration (Environment Variables)

To integrate securely and flexibly, any AI Agent or Client consuming this service should configure connection details via environment variables. Do not hardcode URLs or credentials.

**Recommended `.env` structure for AI Clients:**

```bash
# Search Service Connection
SEARCH_SERVICE_URL=http://localhost:3000  # Or https://api.yourdomain.com
SEARCH_SERVICE_TIMEOUT=5000               # Timeout in ms

# Authentication (If enabled on public endpoints)
SEARCH_SERVICE_API_KEY=your_secure_api_key

# Feature Flags for AI Logic
ENABLE_SEMANTIC_SEARCH=true
ENABLE_HYPERLOCAL_CONTEXT=true
DEFAULT_SEARCH_RADIUS_KM=5
```

**Integration Code Snippet (Python Example):**

```python
import os
import requests

BASE_URL = os.getenv("SEARCH_SERVICE_URL", "http://localhost:3000")
API_KEY = os.getenv("SEARCH_SERVICE_API_KEY")

headers = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}

def search_food(query, lat=None, lon=None, veg=False):
    params = {
        "q": query,
        "veg": "1" if veg else "0",
        "semantic": "1" if os.getenv("ENABLE_SEMANTIC_SEARCH") == "true" else "0"
    }
    if lat and lon:
        params.update({"lat": lat, "lon": lon, "radius_km": os.getenv("DEFAULT_SEARCH_RADIUS_KM", 5)})
        
    response = requests.get(f"{BASE_URL}/v2/search/items", params=params, headers=headers)
    return response.json()
```

## Detailed Integration Architecture

The Search Service is designed to function as a **Context Provider** for your AI Orchestrator (e.g., LangChain, AutoGPT, or custom LLM agents).

### 1. The "Tool Use" Pattern
The most robust integration is to define the Search Service as a set of **Tools** that your LLM can invoke.

*   **Tool 1: `find_food_items`**
    *   **Description**: "Search for food dishes based on name, description, or semantic meaning."
    *   **Arguments**: `query` (string), `is_veg` (boolean), `max_price` (number).
    *   **Maps to**: `GET /v2/search/items?module_id=4&...`

*   **Tool 2: `find_restaurants`**
    *   **Description**: "Find restaurants or stores nearby."
    *   **Arguments**: `query` (string), `latitude` (float), `longitude` (float).
    *   **Maps to**: `GET /v2/search/stores?module_id=4&...`

*   **Tool 3: `get_recommendations`**
    *   **Description**: "Get items that are frequently bought together with a specific item."
    *   **Arguments**: `item_id` (string).
    *   **Maps to**: `GET /search/recommendations/{itemId}`

### 2. The "RAG" (Retrieval-Augmented Generation) Pattern
For chat interfaces (e.g., "What's good to eat nearby?"), use the Search Service to retrieve context *before* sending the prompt to the LLM.

1.  **User Query**: "I'm hungry for something spicy."
2.  **Orchestrator**: Calls `GET /search/semantic/food?q=spicy&lat=...&lon=...`
3.  **Search Service**: Returns top 5 spicy dishes using vector similarity.
4.  **Orchestrator**: Constructs prompt:
    > "User wants something spicy. Here are the available options nearby: [List of 5 dishes with prices and store names]. Recommend one and explain why."
5.  **LLM**: Generates a personalized response based on the real-time data.

## Direct Database Access (MySQL)
The Search Service maintains a direct connection pool to the primary MySQL database. This enables "Smart" capabilities beyond simple search:

1.  **Real-Time Validation**: While OpenSearch is fast, it may have slight CDC lag. The service can query MySQL directly to validate:
    *   **Exact Stock Levels**: Ensure an item is actually in stock before an AI agent confirms an order.
    *   **Store Status**: Check `active` and `open` flags in real-time.
2.  **Rich Context Retrieval**:
    *   **Category Hierarchy**: `getCategoryWithChildren` allows the AI to understand that "Fruit" includes "Apples" and "Bananas".
    *   **Store Metadata**: Fetch logos, addresses, and cover photos directly.

## Integration Workflow Example

1. **User**: "I want a burger, but make it veg, under 200 rupees."
2. **AI Agent**:
   - Extracts intent: `search_items`
   - Extracts filters: `q="burger"`, `veg=1`, `price_max=200`
3. **Action**: Call `GET /v2/search/items?q=burger&veg=1&price_max=200&module_id=4`
4. **Response**: Returns JSON list of burgers matching criteria.
5. **AI Agent**: Formats response for user.

## Future Enhancements for AI Orchestrators
To make the system even smarter for an AI Orchestrator, consider exposing these additional endpoints (leveraging the existing MySQL connection):

*   **`GET /ai/order-status/{orderId}`**: Allow the AI to answer "Where is my food?" by querying the `orders` table directly.
*   **`GET /ai/user-history/{userId}`**: Allow the AI to personalize recommendations based on past orders (e.g., "Reorder my usual").
*   **`GET /ai/inventory-check`**: A batch endpoint to validate stock for multiple items in a cart before checkout.

## Known Issues / Notes
- **Vector Field**: The application code has been updated to correctly query `combined_vector` (384d) instead of the incorrect `item_vector`.
