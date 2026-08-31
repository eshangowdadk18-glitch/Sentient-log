from typing import TypedDict


class DimensionDefinition(TypedDict):
    field_expression: str
    value_type: str


DIMENSIONS: dict[str, DimensionDefinition] = {
    "service": {
        "field_expression": "JSONExtractString(metadata, 'service')",
        "value_type": "string",
    },
    "endpoint": {
        "field_expression": "coalesce(JSONExtractString(metadata, 'endpoint'), url)",
        "value_type": "string",
    },
    "path": {
        "field_expression": "coalesce(JSONExtractString(metadata, 'endpoint'), url)",
        "value_type": "string",
    },
    "status_code": {
        "field_expression": "toInt32OrZero(JSONExtractString(metadata, 'status_code'))",
        "value_type": "number",
    },
    "environment": {
        "field_expression": "JSONExtractString(metadata, 'environment')",
        "value_type": "string",
    },
    "method": {
        "field_expression": "JSONExtractString(metadata, 'method')",
        "value_type": "string",
    },
    "host": {
        "field_expression": "JSONExtractString(metadata, 'host')",
        "value_type": "string",
    },
    "region": {
        "field_expression": "JSONExtractString(metadata, 'region')",
        "value_type": "string",
    },
}


TIME_DIMENSIONS: dict[str, str] = {
    "minute": "toStartOfMinute(timestamp)",
    "hour": "toStartOfHour(timestamp)",
    "day": "toStartOfDay(timestamp)",
}


def is_dimension_allowed(name: str) -> bool:
    return name in DIMENSIONS or name in TIME_DIMENSIONS


def resolve_dimension_expression(name: str) -> str:
    if name in DIMENSIONS:
        return DIMENSIONS[name]["field_expression"]
    if name in TIME_DIMENSIONS:
        return TIME_DIMENSIONS[name]
    raise KeyError(f"Unknown dimension: {name}")


def allowed_dimensions() -> list[str]:
    return sorted(list(DIMENSIONS.keys()) + list(TIME_DIMENSIONS.keys()))
