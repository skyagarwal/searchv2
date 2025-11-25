# LLM Model Used in Search Functionality

## Overview

The Search Mangwale AI system uses **semantic search** powered by a **Sentence Transformer model** to enable intelligent, context-aware search beyond simple keyword matching.

---

## 🤖 Model Details

### **Model Name**: `all-MiniLM-L6-v2`
- **Type**: Sentence Transformer (from Hugging Face)
- **Framework**: `sentence-transformers` (Python)
- **Dimensions**: 384-dimensional vectors
- **Parameters**: 22.7 million
- **Training**: Trained on 1+ billion sentence pairs
- **Architecture**: 6-layer transformer
- **License**: Apache 2.0 (free for commercial use)

### **Why This Model?**
- ✅ **Fast**: ~10ms per embedding, ~120 items/sec throughput
- ✅ **Lightweight**: ~80MB model size, ~500MB memory usage
- ✅ **Multilingual**: Good support for multiple languages
- ✅ **Optimized**: Specifically designed for semantic similarity tasks
- ✅ **Balanced**: Good trade-off between accuracy and speed

---

## 🏗️ Architecture

### **Service Architecture**

```
┌─────────────────┐
│   User Query    │
│ "spicy chicken" │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Search API (NestJS)           │
│   Port: 3100                    │
│   - Receives search request      │
│   - Checks if semantic=1         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Embedding Service (FastAPI)   │
│   Port: 3101                     │
│   - Loads all-MiniLM-L6-v2      │
│   - Generates 384-dim vector    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   OpenSearch (Vector Database)  │
│   Port: 9200                     │
│   - KNN search on item_vector    │
│   - HNSW algorithm               │
│   - Returns similar items        │
└─────────────────────────────────┘
```

---

## 🔄 How It Works

### **Step-by-Step Process**

#### **1. User Makes Search Request**
```http
GET /v2/search/items?q=spicy chicken dish&module_id=4&semantic=1
```

#### **2. Search API Detects Semantic Flag**
```typescript
// apps/search-api/src/search/search.service.ts (line 3906-3910)
const semanticValue = filters?.semantic;
const useSemantic = semanticValue === true || String(semanticValue) === '1';

if (useSemantic && q && q.trim()) {
  // Use semantic search
  const embedding = await this.embeddingService.generateEmbedding(q);
}
```

#### **3. Embedding Service Generates Vector**
```python
# embedding-service.py (line 81-85)
embeddings = model.encode(
    request.texts,  # ["spicy chicken dish"]
    normalize_embeddings=True,
    show_progress_bar=False
)
# Returns: [0.123, -0.456, 0.789, ...] (384 numbers)
```

**What happens inside the model:**
- Text tokenization → Transformer encoding → Dense vector representation
- The model understands semantic meaning:
  - "spicy chicken dish" → understands it's about:
    - Spicy food
    - Chicken-based items
    - Main dishes/curries
    - Not desserts or drinks

#### **4. Vector Search in OpenSearch**
```typescript
// search.service.ts (line 3914-3926)
const body = {
  query: {
    bool: {
      must: [{
        knn: {
          item_vector: {
            vector: embedding,  // 384-dim vector
            k: 100  // Find top 100 similar items
          }
        }
      }],
      filter: filterClauses  // Apply filters (veg, price, etc.)
    }
  }
};
```

**KNN (k-Nearest Neighbors) Search:**
- Uses **HNSW algorithm** (Hierarchical Navigable Small World)
- Finds items with similar vectors (semantically similar)
- Distance metric: **L2 (Euclidean distance)**
- Lower distance = more similar

#### **5. Results Returned**
```json
{
  "items": [
    {
      "name": "Chicken Tikka Masala",
      "description": "Spicy Indian curry with tender chicken",
      "score": 0.759,  // Similarity score
      "price": 350
    },
    {
      "name": "Spicy Chicken Biryani",
      "description": "Aromatic rice with spicy chicken",
      "score": 0.743,
      "price": 280
    }
  ],
  "semantic_search": true
}
```

---

## 📊 Example: How Semantic Search Works

### **Query**: "healthy breakfast options"

**Traditional Keyword Search** would find:
- Items with exact words "healthy", "breakfast", "options"
- Might miss: "oats", "fruits", "smoothies" (if they don't contain those exact words)

**Semantic Search** finds:
1. 🥬 **Vegetarian Breakfast Box** (score: 0.759)
   - Contains: oats, fruits, yogurt
   - Model understands: "healthy" + "breakfast" = nutritious morning meal

2. 🥬 **Poha** (score: 0.713)
   - Traditional Indian breakfast
   - Model understands: breakfast food, light meal

3. 🥬 **Upma** (score: 0.710)
   - Another breakfast item
   - Model understands: morning meal, healthy option

4. 🥬 **Bread Butter** (score: 0.704)
   - Simple breakfast
   - Model understands: breakfast category

**Why it works:**
- The model was trained on millions of sentence pairs
- It learned that "healthy breakfast" is semantically related to:
  - Morning meals
  - Light foods
  - Nutritious options
  - Traditional breakfast items

---

## 🎯 Key Features

### **1. Semantic Understanding**
- Understands **meaning**, not just keywords
- Example: "spicy chicken dish" finds curries, tikkas, biryanis (not just items with those exact words)

### **2. Typo Tolerance**
- "piza" → finds "pizza"
- "biryani" → finds "biryani", "biriyani", "biryani rice"

### **3. Cross-Lingual Support**
- Can find items even if query language differs from item names
- Works with multilingual data

### **4. Contextual Search**
- "healthy breakfast" → understands it's about nutritious morning meals
- "spicy food" → understands heat level, not just the word "spicy"

### **5. Hybrid Search**
- Falls back to keyword search if embedding fails
- Can combine semantic + keyword search for best results

---

## 🔧 Technical Implementation

### **Embedding Service** (`embedding-service.py`)

```python
# Load model once at startup
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# Generate embeddings
@app.post("/embed")
async def embed_texts(request: EmbedRequest):
    embeddings = model.encode(
        request.texts,  # List of texts
        normalize_embeddings=True  # Normalize to unit vectors
    )
    return {"embeddings": embeddings.tolist()}
```

**Performance:**
- Single text: ~10ms
- Batch (50 texts): ~400ms (~8ms per text)
- Throughput: ~120 items/sec
- Memory: ~500MB per worker

### **Search API Integration** (`embedding.service.ts`)

```typescript
async generateEmbedding(text: string): Promise<number[] | null> {
  const response = await axios.post(
    `${this.embeddingUrl}/embed`,
    { texts: [text] },
    { timeout: 5000 }
  );
  return response.data.embeddings[0];  // 384-dim array
}
```

### **OpenSearch Vector Index**

**Index Mapping:**
```json
{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "description": { "type": "text" },
      "item_vector": {
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

**Vector Storage:**
- Each item has a pre-computed `item_vector` field
- Vector is generated from: `name + category_name + description`
- Stored as 384 floating-point numbers

---

## 📈 Performance Metrics

### **Search Performance**
- **Vector search latency**: 50-100ms
- **Embedding generation**: <100ms
- **Total query time**: <200ms
- **Relevance scores**: 0.7-0.8 for good matches

### **Index Statistics**
- **Food items**: 11,348 items with vectors (100% coverage)
- **Ecom items**: 1,846 items with vectors (100% coverage)
- **Index size**: ~364 MB for food items

---

## 🚀 Usage in API

### **Enable Semantic Search**

Add `semantic=1` parameter to any search endpoint:

```http
GET /v2/search/items?q=spicy chicken dish&module_id=4&semantic=1
GET /v2/search/suggest?q=healthy breakfast&semantic=1
```

### **How It's Triggered**

From your Postman collection:
```json
{
  "name": "Items - Semantic Search",
  "request": {
    "url": "{{base_url}}/v2/search/items?q=spicy chicken dish&module_id=4&semantic=1"
  }
}
```

**Code Path:**
1. Request comes to `SearchController`
2. `SearchService.searchItems()` is called
3. Checks `filters.semantic === '1'`
4. If true → calls `semanticSearch()` or uses KNN query
5. Otherwise → uses traditional keyword search

---

## 🎓 How the Model Learns

### **Training Process**
1. **Pre-training**: Model trained on 1+ billion sentence pairs
2. **Learning**: Understands relationships like:
   - "spicy" ↔ "hot", "fiery", "pungent"
   - "chicken" ↔ "poultry", "meat"
   - "breakfast" ↔ "morning meal", "first meal"

3. **Embedding Space**:
   - Similar meanings → close vectors
   - Different meanings → far vectors
   - Example: "pizza" and "burger" are closer than "pizza" and "laptop"

### **Vector Similarity**
- **Cosine Similarity**: Measures angle between vectors
- **L2 Distance**: Measures Euclidean distance
- **Lower distance** = **More similar** = **Better match**

---

## 🔍 Comparison: Keyword vs Semantic

### **Keyword Search**
```
Query: "spicy chicken"
Results:
- Items with "spicy" AND "chicken" in name/description
- Misses: "hot chicken curry" (no "spicy" word)
- Misses: "chicken tikka" (no "spicy" word)
```

### **Semantic Search**
```
Query: "spicy chicken"
Results:
- ✅ "Chicken Tikka Masala" (understands "spicy" = "hot")
- ✅ "Hot Chicken Curry" (understands "hot" = "spicy")
- ✅ "Chicken Biryani" (understands context: spicy dish)
- ✅ "Tandoori Chicken" (understands: spicy preparation)
```

---

## 🛠️ Configuration

### **Environment Variables**
```bash
EMBEDDING_SERVICE_URL=http://embedding-service:3101
```

### **Docker Service**
```yaml
embedding-service:
  build:
    dockerfile: Dockerfile.embedding
  ports:
    - "3101:3101"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3101/health"]
```

### **Health Check**
```bash
curl http://localhost:3101/health

Response:
{
  "ok": true,
  "model": "all-MiniLM-L6-v2",
  "dimensions": 384,
  "device": "cpu"
}
```

---

## 📝 Summary

**LLM Model**: `all-MiniLM-L6-v2` (Sentence Transformer)

**How It Works**:
1. User query → Embedding Service
2. Model converts text → 384-dim vector
3. Vector → OpenSearch KNN search
4. Finds semantically similar items
5. Returns results with similarity scores

**Key Benefits**:
- ✅ Understands meaning, not just keywords
- ✅ Handles typos and variations
- ✅ Multilingual support
- ✅ Fast performance (<200ms)
- ✅ Works with filters (veg, price, location)

**When to Use**:
- Natural language queries ("spicy chicken dish")
- Conceptual searches ("healthy breakfast")
- Typo tolerance needed
- Cross-lingual search
- Better relevance than keyword search

---

## 🔗 Related Files

- **Embedding Service**: `/home/ubuntu/Devs/Search/embedding-service.py`
- **Embedding Client**: `/home/ubuntu/Devs/Search/apps/search-api/src/modules/embedding.service.ts`
- **Search Service**: `/home/ubuntu/Devs/Search/apps/search-api/src/search/search.service.ts`
- **Docker Config**: `/home/ubuntu/Devs/Search/Dockerfile.embedding`

---

**Last Updated**: Based on current codebase analysis
**Model Version**: all-MiniLM-L6-v2 (stable)
**Status**: ✅ Production-ready and operational

