#!/bin/bash
# Create OpenSearch indices with k-NN vector fields for semantic search

OPENSEARCH_URL="http://localhost:9200"

echo "🔧 Creating vector indices for semantic search..."
echo ""

# Food Items V2
echo "📦 Creating food_items_v2 index..."
curl -X PUT "${OPENSEARCH_URL}/food_items_v2" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100,
      "number_of_shards": 2,
      "number_of_replicas": 0
    },
    "analysis": {
      "analyzer": {
        "edge_ngram_analyzer": {
          "type": "custom",
          "tokenizer": "edge_ngram_tokenizer",
          "filter": ["lowercase"]
        }
      },
      "tokenizer": {
        "edge_ngram_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 10,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": {"type": "long"},
      "name": {
        "type": "text",
        "fields": {
          "keyword": {"type": "keyword", "ignore_above": 256},
          "ngram": {"type": "text", "analyzer": "edge_ngram_analyzer", "search_analyzer": "standard"}
        }
      },
      "description": {"type": "text"},
      "category_id": {"type": "long"},
      "category_name": {
        "type": "text",
        "fields": {
          "keyword": {"type": "keyword", "ignore_above": 256}
        }
      },
      "price": {"type": "double"},
      "veg": {"type": "boolean"},
      "avg_rating": {"type": "double"},
      "rating_count": {"type": "integer"},
      "order_count": {"type": "integer"},
      "store_id": {"type": "long"},
      "store_name": {"type": "text"},
      "store_location": {"type": "geo_point"},
      "delivery_time": {"type": "keyword"},
      "image": {"type": "keyword"},
      "images": {"type": "keyword"},
      "module_id": {"type": "long"},
      "brand": {"type": "text"},
      "discount": {"type": "double"},
      "created_at": {"type": "date"},
      "available_time_starts": {"type": "keyword"},
      "available_time_ends": {"type": "keyword"},
      "name_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": {
            "ef_construction": 128,
            "m": 16
          }
        }
      },
      "description_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": {
            "ef_construction": 128,
            "m": 16
          }
        }
      },
      "combined_vector": {
        "type": "knn_vector",
        "dimension": 384,
        "method": {
          "name": "hnsw",
          "space_type": "cosinesimil",
          "engine": "nmslib",
          "parameters": {
            "ef_construction": 128,
            "m": 16
          }
        }
      }
    }
  }
}
' 2>&1 | grep -E 'acknowledged|error' && echo ""

# Ecom Items V2
echo "📦 Creating ecom_items_v2 index..."
curl -X PUT "${OPENSEARCH_URL}/ecom_items_v2" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "index": {
      "knn": true,
      "knn.algo_param.ef_search": 100,
      "number_of_shards": 2,
      "number_of_replicas": 0
    }
  },
  "mappings": {
    "properties": {
      "id": {"type": "long"},
      "name": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
      "description": {"type": "text"},
      "category_id": {"type": "long"},
      "category_name": {"type": "text"},
      "price": {"type": "double"},
      "brand": {"type": "text"},
      "avg_rating": {"type": "double"},
      "store_name": {"type": "text"},
      "store_location": {"type": "geo_point"},
      "name_vector": {"type": "knn_vector", "dimension": 384, "method": {"name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib", "parameters": {"ef_construction": 128, "m": 16}}},
      "description_vector": {"type": "knn_vector", "dimension": 384, "method": {"name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib", "parameters": {"ef_construction": 128, "m": 16}}},
      "combined_vector": {"type": "knn_vector", "dimension": 384, "method": {"name": "hnsw", "space_type": "cosinesimil", "engine": "nmslib", "parameters": {"ef_construction": 128, "m": 16}}}
    }
  }
}
' 2>&1 | grep -E 'acknowledged|error' && echo ""

echo "✅ Vector indices created successfully!"
echo ""
echo "📊 Verify indices:"
curl -s "${OPENSEARCH_URL}/_cat/indices/food_items_v2,ecom_items_v2?v&h=index,docs.count,store.size" && echo ""
echo ""
echo "Next: Run generate-embeddings.py to populate with data"
