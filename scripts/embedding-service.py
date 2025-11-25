"""
Embedding Service for Mangwale Search
Provides text-to-vector embeddings using sentence-transformers

Model: all-MiniLM-L6-v2 (384 dimensions, fast, lightweight)
Port: 3101
"""

from sentence_transformers import SentenceTransformer
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Mangwale Embedding Service",
    description="Text-to-vector embeddings for semantic search",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load embedding model
logger.info("Loading embedding model: all-MiniLM-L6-v2")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
logger.info("✅ Model loaded successfully")

# Request/Response models
class EmbedRequest(BaseModel):
    texts: List[str]
    normalize: bool = True

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int
    model: str
    count: int

class HealthResponse(BaseModel):
    ok: bool
    model: str
    dimensions: int
    device: str

# Endpoints
@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    """
    Generate embeddings for a list of texts
    
    Example:
        POST /embed
        {
            "texts": ["pizza margherita", "healthy breakfast"]
        }
    """
    try:
        if not request.texts:
            raise HTTPException(status_code=400, detail="texts array cannot be empty")
        
        if len(request.texts) > 1000:
            raise HTTPException(status_code=400, detail="Maximum 1000 texts per request")
        
        logger.info(f"Embedding {len(request.texts)} texts")
        
        # Generate embeddings
        embeddings = model.encode(
            request.texts,
            normalize_embeddings=request.normalize,
            show_progress_bar=False
        )
        
        # Convert to list
        embeddings_list = embeddings.tolist()
        
        logger.info(f"✅ Generated {len(embeddings_list)} embeddings")
        
        return {
            "embeddings": embeddings_list,
            "dimensions": len(embeddings_list[0]) if embeddings_list else 0,
            "model": "all-MiniLM-L6-v2",
            "count": len(embeddings_list)
        }
        
    except Exception as e:
        logger.error(f"❌ Embedding error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    return {
        "ok": True,
        "model": "all-MiniLM-L6-v2",
        "dimensions": 384,
        "device": device
    }

@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "Mangwale Embedding Service",
        "model": "all-MiniLM-L6-v2",
        "dimensions": 384,
        "endpoints": {
            "embed": "POST /embed",
            "health": "GET /health"
        }
    }

if __name__ == "__main__":
    logger.info("🚀 Starting Embedding Service on port 3101")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=3101,
        log_level="info"
    )
