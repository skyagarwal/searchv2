#!/usr/bin/env python3
"""
Generate embeddings for OpenSearch documents and bulk index with vectors.
Processes documents in batches for efficient memory usage.
"""

import requests
import json
import argparse
import time
from typing import List, Dict, Any, Optional

# Configuration
OPENSEARCH_URL = "http://localhost:9200"
EMBEDDING_SERVICE_URL = "http://localhost:3101"
BATCH_SIZE = 100  # Process 100 documents at a time
MAX_EMBEDDING_BATCH = 50  # Embedding service processes 50 texts at once

class EmbeddingGenerator:
    def __init__(self, source_index: str, target_index: str):
        self.source_index = source_index
        self.target_index = target_index
        self.processed_count = 0
        self.error_count = 0
        self.start_time = time.time()
        
    def get_embedding(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Get embeddings from embedding service"""
        try:
            response = requests.post(
                f"{EMBEDDING_SERVICE_URL}/embed",
                json={"texts": texts},
                timeout=30
            )
            response.raise_for_status()
            return response.json()["embeddings"]
        except Exception as e:
            print(f"❌ Embedding error: {e}")
            return None
    
    def scroll_documents(self):
        """Scroll through all documents in source index"""
        # Initialize scroll
        response = requests.post(
            f"{OPENSEARCH_URL}/{self.source_index}/_search?scroll=5m",
            json={
                "size": BATCH_SIZE,
                "query": {"match_all": {}},
                "_source": ["id", "name", "description", "category_name", "price", 
                           "veg", "avg_rating", "rating_count", "store_name", 
                           "store_location", "module_id", "brand", "discount",
                           "image", "images", "delivery_time", "order_count",
                           "created_at", "available_time_starts", "available_time_ends"]
            },
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to initialize scroll: {response.text}")
            return
        
        data = response.json()
        scroll_id = data.get("_scroll_id")
        hits = data.get("hits", {}).get("hits", [])
        total_docs = data.get("hits", {}).get("total", {}).get("value", 0)
        
        print(f"📊 Total documents to process: {total_docs:,}")
        print("")
        
        while hits:
            yield hits
            
            # Get next batch
            response = requests.post(
                f"{OPENSEARCH_URL}/_search/scroll",
                json={"scroll": "5m", "scroll_id": scroll_id},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                break
                
            data = response.json()
            scroll_id = data.get("_scroll_id")
            hits = data.get("hits", {}).get("hits", [])
        
        # Clean up scroll
        if scroll_id:
            requests.delete(
                f"{OPENSEARCH_URL}/_search/scroll",
                json={"scroll_id": [scroll_id]},
                headers={"Content-Type": "application/json"}
            )
    
    def prepare_texts_for_embedding(self, documents: List[Dict]) -> tuple[List[str], List[str], List[str]]:
        """Prepare name, description, and combined texts"""
        names = []
        descriptions = []
        combined = []
        
        for doc in documents:
            source = doc.get("_source", {})
            name = source.get("name", "").strip()
            desc = source.get("description", "").strip()
            category = source.get("category_name", "").strip()
            
            names.append(name)
            descriptions.append(desc if desc else name)
            
            # Combined: name + category + description
            combined_text = f"{name}"
            if category:
                combined_text += f" {category}"
            if desc:
                combined_text += f" {desc}"
            combined.append(combined_text)
        
        return names, descriptions, combined
    
    def bulk_index_with_vectors(self, documents: List[Dict], 
                                name_vectors: List[List[float]],
                                desc_vectors: List[List[float]],
                                combined_vectors: List[List[float]]):
        """Bulk index documents with vector embeddings"""
        bulk_body = []
        
        for doc, name_vec, desc_vec, comb_vec in zip(documents, name_vectors, desc_vectors, combined_vectors):
            source = doc.get("_source", {})
            doc_id = source.get("id")
            
            # Index action
            bulk_body.append(json.dumps({"index": {"_index": self.target_index, "_id": doc_id}}))
            
            # Document with vectors
            doc_with_vectors = {**source}
            doc_with_vectors["name_vector"] = name_vec
            doc_with_vectors["description_vector"] = desc_vec
            doc_with_vectors["combined_vector"] = comb_vec
            
            # Convert integer veg field (0/1) to boolean
            if "veg" in doc_with_vectors and isinstance(doc_with_vectors["veg"], int):
                doc_with_vectors["veg"] = bool(doc_with_vectors["veg"])
            
            bulk_body.append(json.dumps(doc_with_vectors))
        
        # Send bulk request
        bulk_data = "\n".join(bulk_body) + "\n"
        
        try:
            response = requests.post(
                f"{OPENSEARCH_URL}/_bulk",
                data=bulk_data,
                headers={"Content-Type": "application/x-ndjson"},
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                # Count successful indexing
                self.processed_count += len(documents)
                # Count errors if any
                if result.get("errors"):
                    error_count = sum(1 for item in result.get("items", []) 
                                    if item.get("index", {}).get("error"))
                    self.error_count += error_count
                    if error_count > 0:
                        # Show first error for debugging
                        for item in result.get("items", []):
                            if item.get("index", {}).get("error"):
                                print(f"⚠️  Index error: {item['index']['error']}")
                                break
            else:
                print(f"❌ Bulk index failed: {response.status_code}")
                self.error_count += len(documents)
                
        except Exception as e:
            print(f"❌ Bulk index error: {e}")
            self.error_count += len(documents)
    
    def process_batch(self, documents: List[Dict]):
        """Process a batch of documents: generate embeddings and index"""
        if not documents:
            return
        
        # Prepare texts
        names, descriptions, combined = self.prepare_texts_for_embedding(documents)
        
        # Generate embeddings in sub-batches to avoid overwhelming the service
        all_name_vecs = []
        all_desc_vecs = []
        all_comb_vecs = []
        
        for i in range(0, len(names), MAX_EMBEDDING_BATCH):
            batch_names = names[i:i+MAX_EMBEDDING_BATCH]
            batch_descs = descriptions[i:i+MAX_EMBEDDING_BATCH]
            batch_combs = combined[i:i+MAX_EMBEDDING_BATCH]
            
            # Get embeddings
            name_vecs = self.get_embedding(batch_names)
            desc_vecs = self.get_embedding(batch_descs)
            comb_vecs = self.get_embedding(batch_combs)
            
            if not (name_vecs and desc_vecs and comb_vecs):
                print(f"⚠️  Skipping batch due to embedding error")
                self.error_count += len(batch_names)
                continue
            
            all_name_vecs.extend(name_vecs)
            all_desc_vecs.extend(desc_vecs)
            all_comb_vecs.extend(comb_vecs)
            
            time.sleep(0.1)  # Small delay to avoid overloading
        
        # Bulk index with vectors
        if len(all_name_vecs) == len(documents):
            self.bulk_index_with_vectors(documents, all_name_vecs, all_desc_vecs, all_comb_vecs)
    
    def run(self):
        """Main processing loop"""
        print(f"🚀 Starting embedding generation: {self.source_index} → {self.target_index}")
        print(f"⚙️  Batch size: {BATCH_SIZE}, Embedding batch: {MAX_EMBEDDING_BATCH}")
        print("")
        
        batch_num = 0
        for batch in self.scroll_documents():
            batch_num += 1
            batch_start = time.time()
            
            self.process_batch(batch)
            
            batch_time = time.time() - batch_start
            elapsed = time.time() - self.start_time
            rate = self.processed_count / elapsed if elapsed > 0 else 0
            
            print(f"✅ Batch {batch_num}: Processed {len(batch)} docs in {batch_time:.1f}s "
                  f"| Total: {self.processed_count:,} docs ({rate:.1f} docs/sec) "
                  f"| Errors: {self.error_count}")
        
        # Final summary
        total_time = time.time() - self.start_time
        print("")
        print("=" * 70)
        print(f"✅ COMPLETE!")
        print(f"📊 Processed: {self.processed_count:,} documents")
        print(f"❌ Errors: {self.error_count}")
        print(f"⏱️  Total time: {total_time:.1f}s ({self.processed_count/total_time:.1f} docs/sec)")
        print("=" * 70)


def verify_services():
    """Verify required services are running"""
    print("🔍 Verifying services...")
    
    # Check OpenSearch
    try:
        response = requests.get(f"{OPENSEARCH_URL}/_cluster/health", timeout=5)
        if response.status_code == 200:
            health = response.json()
            print(f"✅ OpenSearch: {health['status']} ({health['number_of_nodes']} nodes)")
        else:
            print(f"❌ OpenSearch: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ OpenSearch: {e}")
        return False
    
    # Check Embedding Service
    try:
        response = requests.get(f"{EMBEDDING_SERVICE_URL}/health", timeout=5)
        if response.status_code == 200:
            health = response.json()
            print(f"✅ Embedding Service: {health['model']} ({health['dimensions']} dims)")
        else:
            print(f"❌ Embedding Service: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Embedding Service: {e}")
        return False
    
    print("")
    return True


def main():
    parser = argparse.ArgumentParser(description="Generate embeddings for OpenSearch documents")
    parser.add_argument("--module", required=True, 
                       choices=["food_items", "ecom_items", "rooms", "movies", "services"],
                       help="Module to process")
    parser.add_argument("--source-suffix", default="", 
                       help="Suffix for source index (default: none)")
    parser.add_argument("--target-suffix", default="_v2", 
                       help="Suffix for target index (default: _v2)")
    
    args = parser.parse_args()
    
    source_index = f"{args.module}{args.source_suffix}"
    target_index = f"{args.module}{args.target_suffix}"
    
    # Verify services
    if not verify_services():
        print("❌ Service check failed. Exiting.")
        return 1
    
    # Run generator
    generator = EmbeddingGenerator(source_index, target_index)
    generator.run()
    
    return 0


if __name__ == "__main__":
    exit(main())
