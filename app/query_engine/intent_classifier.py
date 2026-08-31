from app.query_engine.queryplan import QueryType


class IntentClassifier:
    """Observability-aware intent classifier with support for secondary intents."""

    _PRIMARY_RULES: list[tuple[set[str], QueryType]] = [
        ({"over time", "trend", "timeseries", "per minute", "per hour", "timeline"}, "timeseries_query"),
        ({"slow", "latency", "p95", "p99", "latency spike", "slow endpoint"}, "latency_query"),
        ({"incident", "outage", "spike", "anomaly", "failure", "failing"}, "incident_query"),
        ({"compare", "versus", "vs", "compared to", "previous"}, "comparison_query"),
        ({"all", "where", "with", "failed login", "only", "filter"}, "filtering_query"),
        ({"top", "rank", "highest", "lowest", "most", "least"}, "ranking_query"),
    ]

    _SECONDARY_RULES: list[tuple[set[str], QueryType]] = [
        ({"top", "rank", "highest", "lowest", "most", "least"}, "ranking_query"),
        ({"all", "where", "with", "failed login", "only", "filter"}, "filtering_query"),
        ({"over time", "trend", "timeseries", "timeline"}, "timeseries_query"),
    ]

    @classmethod
    def classify(cls, query: str) -> QueryType:
        q = query.lower()

        for keywords, intent in cls._PRIMARY_RULES:
            if any(token in q for token in keywords):
                return intent

        if any(token in q for token in ["count", "average", "avg", "p95", "p99", "sum"]):
            return "aggregation_query"

        return "aggregation_query"

    @classmethod
    def classify_secondary(cls, query: str, primary: QueryType) -> list[QueryType]:
        q = query.lower()
        secondary: list[QueryType] = []

        for keywords, intent in cls._SECONDARY_RULES:
            if intent == primary:
                continue
            if any(token in q for token in keywords):
                secondary.append(intent)

        if not secondary and any(token in q for token in ["count", "average", "avg", "sum"]):
            if primary != "aggregation_query":
                secondary.append("aggregation_query")

        return secondary
