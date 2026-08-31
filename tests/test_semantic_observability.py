from app.analytics.sql_builder import SqlBuilder
from app.query_engine.intent_classifier import IntentClassifier
from app.query_engine.queryplan import QueryPlanV2
from app.query_engine.semantic_mapper import SemanticMapper
from app.query_engine.validator import QueryPlanValidator


def _apply(query: str, metric: str = "requests", aggregation: str = "count") -> QueryPlanV2:
    primary = IntentClassifier.classify(query)
    secondary = IntentClassifier.classify_secondary(query, primary)
    plan = QueryPlanV2(
        query_type=primary,
        intent_tags=secondary,
        metric=metric,
        aggregation=aggregation,
        filters={},
        group_by=[],
        timeframe="1h",
        limit=100,
    )
    mapped = SemanticMapper.enrich(query, plan)
    validation = QueryPlanValidator().validate(mapped)
    assert validation.valid, validation.model_dump()
    return mapped


def test_top_failing_services_semantics():
    mapped = _apply("show top failing services")

    assert mapped.query_type == "incident_query"
    assert "ranking_query" in mapped.intent_tags
    assert mapped.metric == "errors"
    assert mapped.group_by == ["service"]
    assert mapped.order_by is not None
    assert mapped.order_by.field == "error_count"

    sql = SqlBuilder(mapped).build()
    assert "AS service" in sql
    assert "status_code" in sql
    assert "ORDER BY error_count DESC" in sql


def test_auth_failures_semantics():
    mapped = _apply("show auth failures")
    assert mapped.metric == "errors"
    assert "service" in mapped.group_by
    assert mapped.filters["status_code"].operator == "in"


def test_rate_limits_semantics():
    mapped = _apply("show rate limit events")
    assert mapped.filters["status_code"].operator == "eq"
    assert mapped.filters["status_code"].value == 429


def test_top_slow_endpoints_semantics():
    mapped = _apply("show top slow endpoints")
    assert mapped.query_type == "latency_query"
    assert "ranking_query" in mapped.intent_tags
    assert mapped.metric == "latency"
    assert mapped.group_by == ["path"]


def test_request_volume_over_time_semantics():
    mapped = _apply("show request volume over time")
    assert mapped.query_type == "timeseries_query"
    assert mapped.metric == "requests"
    assert mapped.group_by == ["minute"]


def test_observability_queries_catalog_semantics():
    queries = [
        "show top failing services",
        "show all 500 errors",
        "show latency spikes",
        "show top slow endpoints",
        "show failed login attempts",
        "show request volume over time",
        "show services with highest error rate",
        "show ingestion failures",
        "show auth failures",
        "show rate limit events",
    ]

    for q in queries:
        mapped = _apply(q)
        sql = SqlBuilder(mapped).build()
        assert sql.startswith("SELECT ")
        assert " FROM events WHERE " in sql
