from typing import Literal, TypedDict


MetricType = Literal["counter", "gauge"]
AggregationType = Literal["avg", "count", "sum", "min", "max", "p95", "p99"]


class MetricDefinition(TypedDict):
    field: str
    aggregation: AggregationType
    allowed_aggregations: list[AggregationType]
    type: MetricType
    condition: str | None
    description: str
    output_aliases: dict[AggregationType, str]


METRICS: dict[str, MetricDefinition] = {
    "errors": {
        "field": "event_id",
        "aggregation": "count",
        "allowed_aggregations": ["count"],
        "type": "counter",
        "condition": "toInt32OrZero(JSONExtractString(metadata, 'status_code')) >= 500",
        "description": "Server-side failures (status_code >= 500)",
        "output_aliases": {"count": "error_count", "avg": "avg_errors", "sum": "sum_errors", "min": "min_errors", "max": "max_errors", "p95": "p95_errors", "p99": "p99_errors"},
    },
    "latency": {
        "field": "latency_ms",
        "aggregation": "avg",
        "allowed_aggregations": ["avg", "p95", "p99", "min", "max"],
        "type": "gauge",
        "condition": None,
        "description": "Request latency in milliseconds",
        "output_aliases": {"avg": "avg_latency", "p95": "p95_latency", "p99": "p99_latency", "min": "min_latency", "max": "max_latency", "count": "count_latency", "sum": "sum_latency"},
    },
    "requests": {
        "field": "event_id",
        "aggregation": "count",
        "allowed_aggregations": ["count"],
        "type": "counter",
        "condition": None,
        "description": "Total request volume",
        "output_aliases": {"count": "request_count", "avg": "avg_requests", "sum": "sum_requests", "min": "min_requests", "max": "max_requests", "p95": "p95_requests", "p99": "p99_requests"},
    },
}


def metric_exists(metric_name: str) -> bool:
    return metric_name in METRICS


def get_metric(metric_name: str) -> MetricDefinition | None:
    return METRICS.get(metric_name)


def allowed_metrics() -> list[str]:
    return sorted(METRICS.keys())


def metric_output_alias(metric_name: str, aggregation: AggregationType) -> str:
    metric = get_metric(metric_name)
    if not metric:
        return f"{aggregation}_{metric_name}"
    return metric["output_aliases"].get(aggregation, f"{aggregation}_{metric_name}")
