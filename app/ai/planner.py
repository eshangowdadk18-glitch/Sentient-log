import json
from openai import AsyncOpenAI
from app.core.config import settings
from app.query_engine.dimensions_registry import allowed_dimensions
from app.query_engine.examples import FEW_SHOT_EXAMPLES
from app.query_engine.metrics_registry import allowed_metrics, get_metric
from app.query_engine.queryplan import QueryPlanV2, QueryType


def _build_system_prompt() -> str:
    metrics = allowed_metrics()
    dimensions = allowed_dimensions()

    metric_lines = []
    for metric_name in metrics:
        metric = get_metric(metric_name)
        if not metric:
            continue
        metric_lines.append(
            f"- {metric_name}: default={metric['aggregation']} allowed={','.join(metric['allowed_aggregations'])}"
        )

    few_shot = "\n".join(
        [
            f"Q: {example['question']}\nA: {json.dumps(example['query_plan'])}"
            for example in FEW_SHOT_EXAMPLES
        ]
    )

    return f"""You are an AI observability query planner.
Your ONLY task is to return a valid JSON object matching QueryPlanV2.

ALLOWED METRICS:
{chr(10).join(metric_lines)}

ALLOWED DIMENSIONS:
{', '.join(dimensions)}

ALLOWED QUERY TYPES:
aggregation_query, timeseries_query, ranking_query, filtering_query, incident_query, latency_query, comparison_query

STRICT RULES:
1. Return JSON only. No markdown. No prose.
2. Never produce SQL.
3. Never invent metrics, dimensions, or aggregations.
4. filters keys must be allowed dimensions or semantic alias latency.
5. order_by.field must be one of: group_by field, timestamp, or aggregation alias {{aggregation}}_{{metric}}.
6. timeframe format must be <number><m|h|d>.
7. Observability semantics are required: "failing" and "errors" imply server failures (status_code >= 500),
   "traffic" implies requests count, and "slow" implies latency filters.

FEW-SHOT EXAMPLES:
{few_shot}
"""


SYSTEM_PROMPT = _build_system_prompt()

class Planner:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )

    async def get_query_plan(self, question: str, intent: QueryType) -> QueryPlanV2:
        response = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"User query: {question}\n"
                        f"Classified intent: {intent}\n"
                        "Generate QueryPlanV2 JSON and set query_type to the classified intent unless invalid."
                    ),
                },
            ],
            temperature=0
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("No content returned from AI planner")
            
        plan_dict = json.loads(content)
        plan_dict.setdefault("query_type", intent)
        return QueryPlanV2.model_validate(plan_dict)
