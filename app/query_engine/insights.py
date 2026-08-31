from __future__ import annotations

from datetime import datetime
from typing import Any

from app.query_engine.queryplan import QueryPlanV2


def _first_numeric_value(row: dict[str, Any]) -> tuple[str, float] | None:
    for key, value in row.items():
        if isinstance(value, (int, float)):
            return key, float(value)
    return None


def _peak_window(rows: list[dict[str, Any]]) -> tuple[str, float] | None:
    max_value = -1.0
    max_bucket = None
    for row in rows:
        numeric = _first_numeric_value(row)
        if not numeric:
            continue
        _, value = numeric
        if value > max_value:
            max_value = value
            max_bucket = row

    if not max_bucket:
        return None

    ts_candidate = max_bucket.get("minute") or max_bucket.get("hour") or max_bucket.get("day") or max_bucket.get("timestamp")
    if ts_candidate is None:
        return None

    return str(ts_candidate), max_value


def generate_insights(question: str, plan: QueryPlanV2, rows: list[dict[str, Any]]) -> dict[str, Any]:
    row_count = len(rows)
    aggregate_alias = f"{plan.aggregation}_{plan.metric}"

    total_value = 0.0
    for row in rows:
        value = row.get(aggregate_alias)
        if isinstance(value, (int, float)):
            total_value += float(value)

    metric_label = {
        "errors": "failed requests",
        "latency": "latency measurements",
        "requests": "requests",
    }.get(plan.metric, plan.metric)

    detected_value = int(total_value) if total_value else row_count
    primary_summary = f"Detected {detected_value} {metric_label} for timeframe {plan.timeframe}."

    service_counts: dict[str, int] = {}
    for row in rows:
        service = row.get("service")
        if isinstance(service, str) and service:
            service_counts[service] = service_counts.get(service, 0) + 1

    top_service = max(service_counts, key=service_counts.get) if service_counts else None
    peak = _peak_window(rows)

    endpoint_counts: dict[str, int] = {}
    region_counts: dict[str, int] = {}
    values: list[float] = []
    for row in rows:
        endpoint = row.get("endpoint") or row.get("path") or row.get("url")
        if isinstance(endpoint, str) and endpoint:
            endpoint_counts[endpoint] = endpoint_counts.get(endpoint, 0) + 1

        region = row.get("region")
        if isinstance(region, str) and region:
            region_counts[region] = region_counts.get(region, 0) + 1

        value = row.get(aggregate_alias)
        if isinstance(value, (int, float)):
            values.append(float(value))

    details: list[str] = []
    if top_service:
        details.append(f"Most affected service: {top_service}.")
    if endpoint_counts:
        top_endpoints = sorted(endpoint_counts.items(), key=lambda item: item[1], reverse=True)[:2]
        endpoint_text = ", ".join(name for name, _ in top_endpoints)
        details.append(f"Most failures originated from: {endpoint_text}.")
    if region_counts:
        peak_region = max(region_counts, key=region_counts.get)
        details.append(f"Peak failure region: {peak_region}.")
    if peak:
        details.append(f"Peak observed at {peak[0]} with value {peak[1]:.2f}.")
    if len(values) >= 2:
        split = len(values) // 2
        previous = sum(values[:split]) if split > 0 else 0
        current = sum(values[split:])
        if previous > 0:
            delta_pct = ((current - previous) / previous) * 100
            direction = "increased" if delta_pct >= 0 else "decreased"
            details.append(f"Volume {direction} {abs(delta_pct):.0f}% compared to previous interval.")

    incidents = []
    if plan.metric == "errors" and total_value > 0:
        incidents.append(
            {
                "severity": "critical" if total_value > 100 else "warning",
                "title": "Server-side failures detected",
                "description": f"{int(total_value)} errors detected within {plan.timeframe}.",
            }
        )
    elif plan.metric == "latency" and detected_value > 0:
        incidents.append(
            {
                "severity": "warning",
                "title": "Latency degradation detected",
                "description": f"High-latency events detected within {plan.timeframe}.",
            }
        )

    chart_type = "line" if plan.query_type == "timeseries_query" else "bar"

    return {
        "summary": " ".join([primary_summary] + details).strip(),
        "metrics": {
            "total_rows": row_count,
            "total_value": total_value,
            "metric": plan.metric,
            "metric_label": metric_label,
            "aggregation": plan.aggregation,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        },
        "charts": {
            "recommended": chart_type,
            "x_axis": plan.group_by[0] if plan.group_by else "timestamp",
            "y_axis": aggregate_alias,
            "data": rows,
        },
        "incidents": incidents,
        "table": rows,
    }
