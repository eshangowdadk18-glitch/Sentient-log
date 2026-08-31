from typing import Any

from pydantic import BaseModel, Field

from app.query_engine.queryplan import QueryPlanV2 as QueryPlan

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)

class QueryResponse(BaseModel):
    question: str
    query_plan: QueryPlan
    sql: str
    results: list[dict[str, Any]]
    summary: str
    metrics: dict[str, Any] = Field(default_factory=dict)
    charts: dict[str, Any] = Field(default_factory=dict)
    table: list[dict[str, Any]] = Field(default_factory=list)
    incidents: list[dict[str, Any]] = Field(default_factory=list)
    validation: dict[str, Any] = Field(default_factory=dict)
    execution_metadata: dict[str, Any] = Field(default_factory=dict)
