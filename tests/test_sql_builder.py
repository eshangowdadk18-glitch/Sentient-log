import pytest

from app.analytics.sql_builder import SqlBuilder, SqlBuilderError
from app.schemas.query import QueryPlan


def test_sql_builder_valid_plan():
    plan = QueryPlan(
        query_type="timeseries_query",
        metric="latency",
        aggregation="p95",
        group_by=["minute", "service"],
        order_by={"field": "minute", "direction": "asc"},
        limit=10,
        timeframe="24h",
    )

    builder = SqlBuilder(plan)
    sql = builder.build()

    assert "SELECT toStartOfMinute(timestamp) AS minute" in sql
    assert "quantile(0.95)(latency_ms) AS p95_latency" in sql
    assert "GROUP BY toStartOfMinute(timestamp), JSONExtractString(metadata, 'service')" in sql
    assert "LIMIT 10" in sql


def test_sql_builder_invalid_metric():
    plan = QueryPlan(metric="password_hash", aggregation="count")

    with pytest.raises(SqlBuilderError):
        SqlBuilder(plan)


def test_sql_builder_invalid_aggregation():
    plan = QueryPlan(metric="latency", aggregation="sum")
    builder = SqlBuilder(plan)

    with pytest.raises(SqlBuilderError):
        builder.build()


def test_sql_builder_invalid_group_by_dimension():
    plan = QueryPlan(metric="requests", aggregation="count", group_by=["password_hash"])
    builder = SqlBuilder(plan)

    with pytest.raises(SqlBuilderError):
        builder.build()
