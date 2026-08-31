from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


QueryType = Literal[
    "aggregation_query",
    "timeseries_query",
    "ranking_query",
    "filtering_query",
    "incident_query",
    "latency_query",
    "comparison_query",
]
AggregationType = Literal["avg", "count", "sum", "min", "max", "p95", "p99"]
FilterOperator = Literal["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]


class FilterCondition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operator: FilterOperator
    value: Any


class OrderBy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str = Field(..., min_length=1)
    direction: Literal["asc", "desc"]


FilterValue = str | int | float | bool | list[str | int | float | bool] | FilterCondition


class QueryPlanV2(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query_type: QueryType = "aggregation_query"
    intent_tags: list[QueryType] = Field(default_factory=list)
    metric: str = Field(default="requests", min_length=1)
    aggregation: AggregationType = "count"
    filters: dict[str, FilterValue] = Field(default_factory=dict)
    group_by: list[str] = Field(default_factory=list)
    timeframe: str = Field(default="1h", pattern=r"^\d+[mhd]$")
    order_by: OrderBy | None = None
    limit: int = Field(default=100, ge=1, le=1000)

    @field_validator("group_by")
    @classmethod
    def dedupe_group_by(cls, values: list[str]) -> list[str]:
        seen: set[str] = set()
        deduped: list[str] = []
        for value in values:
            if value not in seen:
                deduped.append(value)
                seen.add(value)
        return deduped


QueryPlan = QueryPlanV2
