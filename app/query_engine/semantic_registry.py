from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SemanticTemplate:
    phrase: str
    query_type: str
    metric: str | None = None
    aggregation: str | None = None
    group_by: tuple[str, ...] = ()
    default_limit: int | None = None
    rank_desc: bool = False
    timeframe: str | None = None
    filters: dict[str, tuple[str, object]] | None = None


SEMANTIC_TEMPLATES: tuple[SemanticTemplate, ...] = (
    SemanticTemplate(
        phrase="failing services",
        query_type="incident_query",
        metric="errors",
        aggregation="count",
        group_by=("service",),
        default_limit=10,
        rank_desc=True,
        filters={"status_code": ("gte", 500)},
    ),
    SemanticTemplate(
        phrase="top failing services",
        query_type="incident_query",
        metric="errors",
        aggregation="count",
        group_by=("service",),
        default_limit=10,
        rank_desc=True,
        filters={"status_code": ("gte", 500)},
    ),
    SemanticTemplate(
        phrase="slow endpoints",
        query_type="latency_query",
        metric="latency",
        aggregation="avg",
        group_by=("path",),
        default_limit=10,
        rank_desc=True,
        filters={"latency": ("gt", 1000)},
    ),
    SemanticTemplate(
        phrase="top slow endpoints",
        query_type="latency_query",
        metric="latency",
        aggregation="avg",
        group_by=("path",),
        default_limit=10,
        rank_desc=True,
        filters={"latency": ("gt", 1000)},
    ),
    SemanticTemplate(
        phrase="auth failures",
        query_type="filtering_query",
        metric="errors",
        aggregation="count",
        group_by=("service",),
        filters={"status_code": ("in", [401, 403])},
    ),
    SemanticTemplate(
        phrase="rate limits",
        query_type="filtering_query",
        metric="requests",
        aggregation="count",
        group_by=("service",),
        filters={"status_code": ("eq", 429)},
    ),
    SemanticTemplate(
        phrase="rate limit",
        query_type="filtering_query",
        metric="requests",
        aggregation="count",
        group_by=("service",),
        filters={"status_code": ("eq", 429)},
    ),
    SemanticTemplate(
        phrase="traffic",
        query_type="aggregation_query",
        metric="requests",
        aggregation="count",
    ),
    SemanticTemplate(
        phrase="request volume over time",
        query_type="timeseries_query",
        metric="requests",
        aggregation="count",
        group_by=("minute",),
        rank_desc=False,
    ),
    SemanticTemplate(
        phrase="latency over time",
        query_type="timeseries_query",
        metric="latency",
        aggregation="avg",
        group_by=("minute",),
        rank_desc=False,
    ),
)


VOCABULARY_FILTERS: dict[str, tuple[str, object, str]] = {
    "errors": ("gte", 500, "status_code"),
    "failures": ("gte", 500, "status_code"),
    "500 errors": ("gte", 500, "status_code"),
    "5xx": ("gte", 500, "status_code"),
    "slow requests": ("gt", 1000, "latency"),
    "rate limits": ("eq", 429, "status_code"),
    "rate limit": ("eq", 429, "status_code"),
    "auth failures": ("in", [401, 403], "status_code"),
}


def find_template(query: str) -> SemanticTemplate | None:
    normalized = query.lower()
    for template in SEMANTIC_TEMPLATES:
        if template.phrase in normalized:
            return template
    return None


def iter_vocabulary_matches(query: str) -> list[tuple[str, str, object]]:
    normalized = query.lower()
    matches: list[tuple[str, str, object]] = []
    for token, (operator, value, field) in VOCABULARY_FILTERS.items():
        if token in normalized:
            matches.append((field, operator, value))
    return matches
