from pathlib import Path
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

from agent import run_query
from llm_client import LLMClient
from models import QueryRequest
from scraper_client import ScraperClient
from wire_client import WireClient

app = FastAPI(title="WebMind Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        *(origin.strip() for origin in os.getenv("FRONTEND_ORIGIN", "").split(",") if origin.strip()),
    ],
    allow_origin_regex=r"https://.*\.up\.railway\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    wire = WireClient()
    scraper = ScraperClient()
    return {
        "status": "ok",
        "llm": "mistral" if LLMClient().configured else "demo",
        "wire": "connected" if wire.configured else "demo",
        "scraper": "connected" if scraper.configured else "demo",
    }


@app.get("/api/wire/catalog")
def wire_catalog() -> dict:
    return {
        "actions": [
            "reddit.search",
            "hackernews.search",
            "github.search_repos",
            "github.repo",
            "arxiv.search",
        ]
    }


@app.post("/api/query")
async def query(request: QueryRequest) -> StreamingResponse:
    return StreamingResponse(
        run_query(request.query, request.max_sources),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
