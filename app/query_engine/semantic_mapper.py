import re

from app.query_engine.metrics_registry import metric_output_alias
from app.query_engine.queryplan import FilterCondition, OrderBy, QueryPlanV2
from app.query_engine.semantic_registry import find_template, iter_vocabulary_matches


class SemanticMapper:
    """Maps observability vocabulary into explicit structured query fields."""

    METRIC_KEYWORDS = {
        "errors": ["error", "errors", "failures", "5xx", "500"],
        "latency": ["latency", "slow", "response time", "p95", "p99"],
        "requests": ["traffic", "requests", "volume", "rps"],
    }

    @classmethod
    def enrich(cls, query: str, plan: QueryPlanV2) -> QueryPlanV2:
        normalized_query = query.lower()

        template = find_template(normalized_query)
        if template:
            if template.metric:
                plan.metric = template.metric
            if template.aggregation:
                plan.aggregation = template.aggregation
            if template.query_type:
                plan.query_type = template.query_type  # type: ignore[assignment]
            if template.group_by:
                plan.group_by = list(template.group_by)
            if template.default_limit and plan.limit == 100:
                plan.limit = template.default_limit
            if template.timeframe and plan.timeframe == "1h":
                plan.timeframe = template.timeframe
            if template.filters:
                for field, (operator, value) in template.filters.items():
                    plan.filters[field] = FilterCondition(operator=operator, value=value)

        if plan.metric not in {"errors", "latency", "requests"}:
            inferred_metric = cls._infer_metric(normalized_query)
            if inferred_metric:
                plan.metric = inferred_metric

        semantic_filters = cls._infer_semantic_filters(normalized_query)
        for key, value in semantic_filters.items():
            if key not in plan.filters:
                plan.filters[key] = value

        # Observability default grouping semantics for common investigations.
        if "service" in normalized_query and not plan.group_by:
            plan.group_by = ["service"]
        if ("endpoint" in normalized_query or "path" in normalized_query) and not plan.group_by:
            plan.group_by = ["path"]

        if "all 500" in normalized_query or "show all 500" in normalized_query:
            plan.query_type = "filtering_query"
            plan.metric = "errors"
            plan.aggregation = "count"
            plan.filters["status_code"] = FilterCondition(operator="gte", value=500)

        if "error rate" in normalized_query and "highest" in normalized_query:
            plan.query_type = "incident_query"
            plan.metric = "errors"
            plan.aggregation = "count"
            if not plan.group_by:
                plan.group_by = ["service"]

        if plan.query_type == "timeseries_query" and not plan.group_by:
            plan.group_by = ["minute"]
            plan.order_by = OrderBy(field="minute", direction="asc")

        if "top" in normalized_query or "highest" in normalized_query:
            plan.order_by = OrderBy(field=cls._alias_for(plan.metric, plan.aggregation), direction="desc")

        if plan.query_type == "latency_query" and not plan.order_by:
            plan.order_by = OrderBy(field=cls._alias_for(plan.metric, plan.aggregation), direction="desc")

        return QueryPlanV2.model_validate(plan.model_dump())

    @classmethod
    def _infer_metric(cls, query: str) -> str | None:
        for metric, keywords in cls.METRIC_KEYWORDS.items():
            if any(k in query for k in keywords):
                return metric
        return None

    @classmethod
    def _infer_semantic_filters(cls, query: str) -> dict[str, FilterCondition | str]:
        filters: dict[str, FilterCondition | str] = {}

        for field, operator, value in iter_vocabulary_matches(query):
            filters[field] = FilterCondition(operator=operator, value=value)

        if ("500" in query or "5xx" in query) and "status_code" not in filters:
            filters["status_code"] = FilterCondition(operator="gte", value=500)

        if "slow" in query and "latency" not in filters:
            filters["latency"] = FilterCondition(operator="gt", value=1000)

        login_match = re.search(r"failed login", query)
        if login_match:
            filters["endpoint"] = FilterCondition(operator="contains", value="login")

        service_match = re.search(r"service\s+([a-zA-Z0-9_-]+)", query)
        if service_match:
            filters["service"] = service_match.group(1)

        return filters

    @staticmethod
    def _alias_for(metric: str, aggregation: str) -> str:
        return metric_output_alias(metric, aggregation)  # type: ignore[arg-type]
