import logging
import re

from app.core.utils import aggregation_alias
from app.query_engine.dimensions_registry import resolve_dimension_expression
from app.query_engine.metrics_registry import get_metric, metric_output_alias
from app.query_engine.queryplan import FilterCondition, QueryPlanV2

logger = logging.getLogger(__name__)

class SqlBuilderError(Exception):
    pass


class SqlBuilder:
    _TIMEFRAME_PATTERN = re.compile(r"^(\d+)([mhd])$")

    def __init__(self, plan: QueryPlanV2):
        self.plan = plan
        self.metric_definition = get_metric(plan.metric)
        if not self.metric_definition:
            raise SqlBuilderError(f"Unknown metric: {plan.metric}")

    def build(self) -> str:
        self._validate()

        select_clause = self._build_select()
        where_clause = self._build_where()
        group_by_clause = self._build_group_by()
        order_by_clause = self._build_order_by()
        limit_clause = f"LIMIT {self.plan.limit}"

        sql = f"SELECT {select_clause} FROM events WHERE {where_clause}"
        if group_by_clause:
            sql += f" GROUP BY {group_by_clause}"
        if order_by_clause:
            sql += f" ORDER BY {order_by_clause}"
        sql += f" {limit_clause}"

        return sql

    def _validate(self):
        assert self.metric_definition is not None
        if self.plan.aggregation not in self.metric_definition["allowed_aggregations"]:
            raise SqlBuilderError(
                f"Aggregation {self.plan.aggregation} is not allowed for metric {self.plan.metric}"
            )

        for dimension in self.plan.group_by:
            try:
                resolve_dimension_expression(dimension)
            except KeyError as exc:
                raise SqlBuilderError(str(exc)) from exc

        if self.plan.order_by:
            field = self.plan.order_by.field
            allowed_order_fields = set(self.plan.group_by)
            canonical_alias = aggregation_alias(self.plan.aggregation, self.plan.metric)
            semantic_alias = metric_output_alias(self.plan.metric, self.plan.aggregation)
            allowed_order_fields.add(canonical_alias)
            allowed_order_fields.add(semantic_alias)
            allowed_order_fields.add("timestamp")

            logger.info(f"Validator decisions: Allowed order_by fields: {allowed_order_fields}")

            if field not in allowed_order_fields:
                raise SqlBuilderError(f"Invalid order_by field: {field}. Must be one of {allowed_order_fields}")

    def _build_select(self) -> str:
        select_parts = []
        group_by_expressions = []

        if self.plan.group_by:
            for dimension in self.plan.group_by:
                expression = resolve_dimension_expression(dimension)
                group_by_expressions.append(expression)
                select_parts.append(f"{expression} AS {dimension}")

        agg = self.plan.aggregation
        metric_field = self.metric_definition["field"]
        canonical_alias = aggregation_alias(agg, self.plan.metric)
        alias = metric_output_alias(self.plan.metric, agg)
        logger.info(f"Calculated aggregation alias: {alias}")

        if agg == "p95":
            agg_expression = f"quantile(0.95)({metric_field})"
        elif agg == "p99":
            agg_expression = f"quantile(0.99)({metric_field})"
        elif agg == "count":
            agg_expression = f"count({metric_field})"
        else:
            agg_expression = f"{agg}({metric_field})"

        select_parts.append(f"{agg_expression} AS {alias}")

        if alias != canonical_alias:
            select_parts.append(f"{agg_expression} AS {canonical_alias}")

        self._group_by_expressions = group_by_expressions
        return ", ".join(select_parts)

    def _build_where(self) -> str:
        conditions = [self._build_timeframe_condition()]

        metric_condition = self.metric_definition.get("condition")
        if metric_condition:
            conditions.append(metric_condition)

        for field, value in self.plan.filters.items():
            expression = self._resolve_filter_expression(field)
            if isinstance(value, FilterCondition):
                conditions.append(self._build_operator_condition(expression, value))
            elif isinstance(value, list):
                safe_values = ", ".join(self._format_literal(item) for item in value)
                conditions.append(f"{expression} IN ({safe_values})")
            else:
                conditions.append(f"{expression} = {self._format_literal(value)}")

        deduped_conditions = list(dict.fromkeys(conditions))
        return " AND ".join(deduped_conditions)

    def _build_group_by(self) -> str:
        if not self.plan.group_by:
            return ""
        return ", ".join(self._group_by_expressions)

    def _build_order_by(self) -> str:
        if not self.plan.order_by:
            return ""

        direction = self.plan.order_by.direction.upper()
        return f"{self.plan.order_by.field} {direction}"

    def _build_timeframe_condition(self) -> str:
        match = self._TIMEFRAME_PATTERN.match(self.plan.timeframe)
        if not match:
            raise SqlBuilderError("Invalid timeframe format")

        value = int(match.group(1))
        unit = match.group(2)
        unit_map = {"m": "MINUTE", "h": "HOUR", "d": "DAY"}
        return f"timestamp >= now() - INTERVAL {value} {unit_map[unit]}"

    def _resolve_filter_expression(self, field: str) -> str:
        if field == "latency":
            return "latency_ms"
        return resolve_dimension_expression(field)

    def _build_operator_condition(self, expression: str, value: FilterCondition) -> str:
        op_map = {
            "eq": "=",
            "neq": "!=",
            "gt": ">",
            "gte": ">=",
            "lt": "<",
            "lte": "<=",
        }

        if value.operator in op_map:
            return f"{expression} {op_map[value.operator]} {self._format_literal(value.value)}"

        if value.operator == "contains":
            literal = self._format_literal(f"%{value.value}%")
            return f"{expression} LIKE {literal}"

        if value.operator == "in":
            if not isinstance(value.value, list):
                raise SqlBuilderError("IN operator requires list values")
            safe_values = ", ".join(self._format_literal(item) for item in value.value)
            return f"{expression} IN ({safe_values})"

        raise SqlBuilderError(f"Unsupported filter operator: {value.operator}")

    def _format_literal(self, value: object) -> str:
        if isinstance(value, bool):
            return "1" if value else "0"
        if isinstance(value, (int, float)):
            return str(value)
        if isinstance(value, str):
            safe_val = value.replace("'", "''")
            return f"'{safe_val}'"
        raise SqlBuilderError(f"Unsupported filter literal type: {type(value).__name__}")
