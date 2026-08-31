"""
Mock query handler for bypassing LLM rate limits during testing.
This allows testing the frontend dashboard without hitting Groq rate limits.
"""

import json
from datetime import datetime, timedelta
from typing import Any
from app.query_engine.queryplan import QueryPlanV2


def _generate_timeseries_data():
    """Generate realistic timeseries latency data for the last hour."""
    results = []
    now = datetime.utcnow()
    
    for i in range(60):
        minute_ago = now - timedelta(minutes=60-i)
        minute_bucket = minute_ago.replace(second=0, microsecond=0)
        
        # Generate realistic latency pattern (some peaks, some valleys)
        base_latency = 200 + (i % 10) * 20
        if i % 15 == 0:
            base_latency += 300  # occasional spikes
        
        results.append({
            "minute": minute_bucket.isoformat() + "Z",
            "avg_latency": base_latency + (i % 5) * 10,
            "count_latency": 20 + (i % 10)
        })
    
    return results


# Pre-generated mock query plans for common dashboard queries
MOCK_QUERIES = {
    "count total events": {
        "question": "Count total events",
        "query_plan": {
            "metric": "requests",
            "aggregation": "count",
            "query_type": "aggregation_query",
            "group_by": [],
            "filters": {},
            "timeframe": "24h",
            "limit": 1,
            "intent_tags": []
        },
        "results": [{"count_request_id": 1250}],
    },
    "average latency overall": {
        "question": "Average latency overall",
        "query_plan": {
            "metric": "latency",
            "aggregation": "avg",
            "query_type": "aggregation_query",
            "group_by": [],
            "filters": {},
            "timeframe": "24h",
            "limit": 1,
            "intent_tags": []
        },
        "results": [{"avg_latency": 245.5}],
    },
    "show p95 latency": {
        "question": "Show P95 latency",
        "query_plan": {
            "metric": "latency",
            "aggregation": "p95",
            "query_type": "aggregation_query",
            "group_by": [],
            "filters": {},
            "timeframe": "24h",
            "limit": 1,
            "intent_tags": []
        },
        "results": [{"p95_latency_ms": 750}],
    },
    "count events by type": {
        "question": "Count events by type",
        "query_plan": {
            "metric": "requests",
            "aggregation": "count",
            "query_type": "ranking_query",
            "group_by": ["event_type"],
            "filters": {},
            "timeframe": "24h",
            "limit": 10,
            "intent_tags": []
        },
        "results": [
            {"event_type": "http_request", "count_request_id": 850},
            {"event_type": "database_query", "count_request_id": 320},
            {"event_type": "cache_miss", "count_request_id": 80},
        ],
    },
    "show latency over time": {
        "question": "show latency over time",
        "query_plan": {
            "metric": "latency",
            "aggregation": "avg",
            "query_type": "timeseries_query",
            "group_by": ["minute"],
            "filters": {},
            "timeframe": "1h",
            "limit": 100,
            "intent_tags": []
        },
        "results": _generate_timeseries_data(),
    },
    "count events by event_type last 24h": {
        "question": "Count events by event_type last 24h",
        "query_plan": {
            "metric": "requests",
            "aggregation": "count",
            "query_type": "ranking_query",
            "group_by": ["event_type"],
            "filters": {},
            "timeframe": "24h",
            "limit": 5,
            "intent_tags": []
        },
        "results": [
            {"event_type": "http_request", "count_request_id": 10500},
            {"event_type": "database_query", "count_request_id": 5200},
            {"event_type": "cache_miss", "count_request_id": 1800},
        ],
    },
}


def get_mock_response(question: str) -> dict[str, Any] | None:
    """
    Get a mock response for a query, or None if no mock exists.
    """
    question_lower = question.lower().strip()
    
    # Try exact match first
    if question_lower in MOCK_QUERIES:
        mock = MOCK_QUERIES[question_lower]
        return _build_response(mock)
    
    # Try partial match
    for key in MOCK_QUERIES.keys():
        if key in question_lower:
            mock = MOCK_QUERIES[key]
            return _build_response(mock)
    
    return None


def _build_response(mock_data: dict[str, Any]) -> dict[str, Any]:
    """Build a full QueryResponse from mock data."""
    from app.query_engine.insights import generate_insights
    
    results = mock_data.get("results", [])
    query_plan_data = mock_data.get("query_plan", {})
    
    # Reconstruct QueryPlanV2 from dict
    query_plan = QueryPlanV2(**query_plan_data)
    
    # Generate insights using the same logic as the real backend
    insights = generate_insights(mock_data["question"], query_plan, results)
    
    return {
        "question": mock_data["question"],
        "query_plan": query_plan_data,
        "sql": f"SELECT * FROM events WHERE metric = '{query_plan.metric}'",  # Mock SQL
        "results": results,
        "summary": insights["summary"],
        "metrics": insights["metrics"],
        "charts": insights["charts"],
        "table": insights["table"],
        "incidents": insights["incidents"],
        "validation": {"valid": True},
        "execution_metadata": {"mock": True}
    }
