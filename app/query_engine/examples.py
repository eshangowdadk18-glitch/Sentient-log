FEW_SHOT_EXAMPLES = [
    {
        "question": "show top failing services",
        "query_plan": {
            "query_type": "incident_query",
            "intent_tags": ["ranking_query"],
            "metric": "errors",
            "aggregation": "count",
            "filters": {"status_code": {"operator": "gte", "value": 500}},
            "group_by": ["service"],
            "timeframe": "1h",
            "order_by": {"field": "error_count", "direction": "desc"},
            "limit": 10,
        },
    },
    {
        "question": "show errors over time",
        "query_plan": {
            "query_type": "timeseries_query",
            "metric": "errors",
            "aggregation": "count",
            "filters": {"status_code": {"operator": "gte", "value": 500}},
            "group_by": ["minute"],
            "timeframe": "24h",
            "order_by": {"field": "minute", "direction": "asc"},
            "limit": 240,
        },
    },
    {
        "question": "show top slow endpoints",
        "query_plan": {
            "query_type": "latency_query",
            "intent_tags": ["ranking_query"],
            "metric": "latency",
            "aggregation": "avg",
            "filters": {"latency": {"operator": "gt", "value": 1000}},
            "group_by": ["path"],
            "timeframe": "24h",
            "order_by": {"field": "avg_latency", "direction": "desc"},
            "limit": 10,
        },
    },
    {
        "question": "show auth failures",
        "query_plan": {
            "query_type": "filtering_query",
            "metric": "errors",
            "aggregation": "count",
            "filters": {"status_code": {"operator": "in", "value": [401, 403]}},
            "group_by": ["service"],
            "timeframe": "1h",
            "order_by": {"field": "error_count", "direction": "desc"},
            "limit": 100,
        },
    },
]


OBSERVABILITY_QUERY_EXAMPLES = [
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
