from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    max_sources: int = Field(default=5, ge=1, le=6)
