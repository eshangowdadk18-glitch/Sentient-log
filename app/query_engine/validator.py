import re
from typing import Any

from pydantic import BaseModel, Field

from app.query_engine.dimensions_registry import DIMENSIONS, is_dimension_allowed
from app.query_engine.metrics_registry import get_metric, metric_exists, metric_output_alias
from app.query_engine.queryplan import FilterCondition, QueryPlanV2


class ValidationErrorDetail(BaseModel):
    field: str
    code: str
    message: str


class QueryPlanValidationResult(BaseModel):
    valid: bool
    errors: list[ValidationErrorDetail] = Field(default_factory=list)


class QueryPlanValidator:
    _TIMEFRAME_PATTERN = re.compile(r"^(\d+)([mhd])$")

    def validate(self, plan: QueryPlanV2) -> QueryPlanValidationResult:
        errors: list[ValidationErrorDetail] = []

        if not metric_exists(plan.metric):
            errors.append(
                ValidationErrorDetail(
                    field="metric",
                    code="unknown_metric",
                    message=f"Metric '{plan.metric}' is not in the semantic metrics registry.",
                )
            )
            return QueryPlanValidationResult(valid=False, errors=errors)

        metric_definition = get_metric(plan.metric)
        assert metric_definition is not None

        if plan.aggregation not in metric_definition["allowed_aggregations"]:
            errors.append(
                ValidationErrorDetail(
                    field="aggregation",
                    code="invalid_aggregation",
                    message=f"Aggregation '{plan.aggregation}' is not allowed for metric '{plan.metric}'.",
                )
            )

        for dimension in plan.group_by:
            if not is_dimension_allowed(dimension):
                errors.append(
                    ValidationErrorDetail(
                        field="group_by",
                        code="unknown_dimension",
                        message=f"Group-by dimension '{dimension}' is not allowed.",
                    )
                )

        for field, raw_value in plan.filters.items():
            if field == "latency":
                # Semantic alias accepted and normalized in SQL builder.
                if not isinstance(raw_value, FilterCondition):
                    errors.append(
                        ValidationErrorDetail(
                            field=f"filters.{field}",
                            code="invalid_filter_value",
                            message="latency filter must include an operator condition.",
                        )
                    )
                continue

            if not is_dimension_allowed(field):
                errors.append(
                    ValidationErrorDetail(
                        field=f"filters.{field}",
                        code="unknown_filter_field",
                        message=f"Filter field '{field}' is not an allowed observability dimension.",
                    )
                )
                continue

            if isinstance(raw_value, FilterCondition):
                self._validate_filter_condition(field, raw_value, errors)
            else:
                self._validate_primitive_filter(field, raw_value, errors)

        if not self._validate_timeframe(plan.timeframe):
            errors.append(
                ValidationErrorDetail(
                    field="timeframe",
                    code="invalid_timeframe",
                    message="Timeframe must match <number><m|h|d> and stay within 30 days.",
                )
            )

        if plan.order_by:
            allowed_order_fields = set(plan.group_by)
            allowed_order_fields.add(f"{plan.aggregation}_{plan.metric}")
            allowed_order_fields.add(metric_output_alias(plan.metric, plan.aggregation))
            allowed_order_fields.add("timestamp")
            if plan.order_by.field not in allowed_order_fields:
                errors.append(
                    ValidationErrorDetail(
                        field="order_by.field",
                        code="invalid_order_field",
                        message=f"order_by.field must be one of {sorted(allowed_order_fields)}",
                    )
                )

        for intent_tag in plan.intent_tags:
            if intent_tag == plan.query_type:
                errors.append(
                    ValidationErrorDetail(
                        field="intent_tags",
                        code="duplicate_intent",
                        message="intent_tags must not duplicate query_type.",
                    )
                )

        return QueryPlanValidationResult(valid=len(errors) == 0, errors=errors)

    def _validate_filter_condition(
        self, field: str, condition: FilterCondition, errors: list[ValidationErrorDetail]
    ) -> None:
        if condition.operator in {"gt", "gte", "lt", "lte"} and not isinstance(condition.value, (int, float)):
            errors.append(
                ValidationErrorDetail(
                    field=f"filters.{field}",
                    code="invalid_numeric_filter",
                    message="Numeric comparison filters require int or float values.",
                )
            )

        if condition.operator == "contains" and not isinstance(condition.value, str):
            errors.append(
                ValidationErrorDetail(
                    field=f"filters.{field}",
                    code="invalid_contains_filter",
                    message="contains filter requires a string value.",
                )
            )

        if condition.operator == "in" and not isinstance(condition.value, list):
            errors.append(
                ValidationErrorDetail(
                    field=f"filters.{field}",
                    code="invalid_in_filter",
                    message="in filter requires a list value.",
                )
            )

    def _validate_primitive_filter(self, field: str, value: Any, errors: list[ValidationErrorDetail]) -> None:
        if isinstance(value, (str, int, float, bool)):
            if field in DIMENSIONS and DIMENSIONS[field]["value_type"] == "number" and not isinstance(value, (int, float)):
                errors.append(
                    ValidationErrorDetail(
                        field=f"filters.{field}",
                        code="invalid_filter_type",
                        message=f"Filter field '{field}' expects a numeric value.",
                    )
                )
            return

        errors.append(
            ValidationErrorDetail(
                field=f"filters.{field}",
                code="invalid_filter_value",
                message="Filter value must be a primitive or a structured condition.",
            )
        )

    def _validate_timeframe(self, timeframe: str) -> bool:
        match = self._TIMEFRAME_PATTERN.match(timeframe)
        if not match:
            return False

        value = int(match.group(1))
        unit = match.group(2)
        if unit == "m":
            return 1 <= value <= 60 * 24
        if unit == "h":
            return 1 <= value <= 24 * 30
        if unit == "d":
            return 1 <= value <= 30
        return False
