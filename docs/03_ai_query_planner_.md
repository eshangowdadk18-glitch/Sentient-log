# Chapter 3: AI Query Planner

In the last chapter, [Metric and Dimension Registries](02_metric_and_dimension_registries_.md), we learned about `Sentient-log`'s "data dictionary" – how it knows all the different measurements (metrics) it can take and all the ways it can categorize data (dimensions). Think of it as knowing all the ingredients in your pantry.

Now, imagine you have a question you want to ask your pantry, like: "Please show me the top-selling spices this month." You wouldn't just shout that into the pantry and expect results, right? You need someone super smart to understand your request and figure out the exact steps to get that information.

This is where the **AI Query Planner** comes in! It's the "brain" of `Sentient-log`. Its job is to take your everyday question, understand what you mean, and then create a precise "recipe" for how to get the data you're asking for.

### What Problem Does It Solve?

`Sentient-log` is powerful because you can talk to it naturally. You don't need to learn a complex computer language to ask questions. But computers don't understand "natural language" (like English) directly. They need very specific instructions.

The core problem the AI Query Planner solves is: **How do we translate a human's natural language question into a structured set of instructions that the `Sentient-log` system can understand and execute?**

Let's use a common situation as our main example: **A user wants to ask, "Show me the top failing services in the last hour."**

### Breaking Down the "Brain"

The AI Query Planner works like a super-smart assistant that specializes in `Sentient-log` data. Here's how it breaks down its job:

1.  **Understanding Your Intent**: It first figures out what kind of question you're asking. Are you looking for errors? Latency? Just counting requests?
2.  **Using Its "Cheat Sheet" (Registries)**: It then uses the [Metric and Dimension Registries](02_metric_and_dimension_registries_.md) (its "cheat sheet") to make sure it's using only the allowed metrics and dimensions. It knows what "failing" means, what a "service" is, and what "last hour" implies, all thanks to these registries.
3.  **Creating a "Query Plan"**: Finally, its main goal is to generate a structured `Query Plan` (which we'll explore in detail in [Chapter 4: Query Plan (QueryPlanV2)](04_query_plan__queryplanv2__.md)). This `Query Plan` is like a detailed recipe that tells the rest of the system exactly what data to fetch, how to filter it, how to group it, and how to order it.

### How the AI Query Planner Solves Our Use Case

Let's see how the AI Query Planner would tackle our example question: "**Show me the top failing services in the last hour.**"

Here's the step-by-step thinking process of the AI Query Planner:

1.  **"Show me the top failing services"**:
    *   The AI recognizes "failing" and knows from its "cheat sheet" (the [Metric and Dimension Registries](02_metric_and_dimension_registries_.md)) that this usually maps to the `errors` metric.
    *   It knows that `errors` are typically `count`ed.
    *   It also knows that "failing" often implies a filter for `status_code >= 500`.
    *   "Services" means it needs to `group_by` the `service` dimension.
    *   "Top" implies an `order_by` (by the error count, descending) and a `limit` (e.g., top 10).

2.  **"in the last hour"**:
    *   The AI understands this is a `timeframe` filter, setting it to `1h`.

The AI Query Planner will then combine all this understanding into a structured `Query Plan`. Here's what that "recipe" might look like (don't worry if all the terms don't make sense yet, we'll cover Query Plans in the next chapter):

```json
{
  "query_type": "incident_query",
  "intent_tags": ["ranking_query"],
  "metric": "errors",
  "aggregation": "count",
  "filters": {
    "status_code": {"operator": "gte", "value": 500}
  },
  "group_by": ["service"],
  "timeframe": "1h",
  "order_by": {"field": "error_count", "direction": "desc"},
  "limit": 10
}
```
This JSON (JavaScript Object Notation) is a universal way for computers to exchange structured information. The AI Query Planner transforms your natural question into this precise, machine-readable format.

### Under the Hood: How the AI Query Planner Works

Let's take a look at the secret sauce behind the AI Query Planner.

When you type your question into `Sentient-log` and hit Enter, here's a simplified sequence of events:

```mermaid
sequenceDiagram
    participant User
    participant Frontend App
    participant Sentient-log API
    participant Intent Classifier
    participant AI Query Planner
    participant AI Model (e.g., OpenAI)
    participant Registries (Metric/Dimension)

    User->>Frontend App: "Show top failing services"
    Frontend App->>Sentient-log API: POST /api/v1/query (question)
    Sentient-log API->>Intent Classifier: Classify user question
    Intent Classifier-->>Sentient-log API: Classified Intent (e.g., "incident_query")
    Sentient-log API->>AI Query Planner: Get Query Plan (question, intent)
    AI Query Planner->>Registries (Metric/Dimension): Ask for allowed metrics and dimensions
    Registries (Metric/Dimension)-->>AI Query Planner: Return lists (the "cheat sheet")
    AI Query Planner->>AI Query Planner: Builds system prompt (rules, cheat sheet, examples)
    AI Query Planner->>AI Model (e.g., OpenAI): Send question, intent, and system prompt
    AI Model (e.g., OpenAI)-->>AI Query Planner: Returns Query Plan (JSON format)
    AI Query Planner-->>Sentient-log API: Returns Query Plan
    Sentient-log API-->>Frontend App: Continues processing with Query Plan
```

As you can see, the AI Query Planner is a central piece. It takes the initial question, uses its knowledge sources (like the registries and examples), and consults a powerful AI Model to generate the final `Query Plan`.

#### 1. The AI's "Cheat Sheet" (System Prompt)

The most important part of the AI Query Planner's internal workings is how it builds a special instruction set for the AI Model it uses (like OpenAI's models). This instruction set is called a **system prompt**. It's like giving your super-smart assistant a very specific rulebook and a list of what it's allowed to talk about.

This `SYSTEM_PROMPT` is built dynamically, meaning it includes information directly from our [Metric and Dimension Registries](02_metric_and_dimension_registries_.md), ensuring the AI only suggests valid terms. It also includes "few-shot examples" to teach the AI what good `Query Plan` outputs look like for different questions.

Here's how parts of the `SYSTEM_PROMPT` are built in `app/ai/planner.py`:

```python
# From: app/ai/planner.py
import json
from app.query_engine.dimensions_registry import allowed_dimensions
from app.query_engine.examples import FEW_SHOT_EXAMPLES
from app.query_engine.metrics_registry import allowed_metrics, get_metric

def _build_system_prompt() -> str:
    metrics = allowed_metrics() # Get all metric names (e.g., "errors", "latency")
    dimensions = allowed_dimensions() # Get all dimension names (e.g., "service", "status_code")

    metric_lines = []
    for metric_name in metrics:
        metric = get_metric(metric_name)
        if not metric: continue
        # Format detailed metric info for the AI
        metric_lines.append(
            f"- {metric_name}: default={metric['aggregation']} allowed={','.join(metric['allowed_aggregations'])}"
        )

    few_shot = "\n".join(
        [
            f"Q: {example['question']}\nA: {json.dumps(example['query_plan'])}"
            for example in FEW_SHOT_EXAMPLES # These are sample Q&A pairs
        ]
    )

    return f"""You are an AI observability query planner.
Your ONLY task is to return a valid JSON object matching QueryPlanV2.

ALLOWED METRICS:
{chr(10).join(metric_lines)} # The AI sees this list of valid metrics

ALLOWED DIMENSIONS:
{', '.join(dimensions)} # The AI sees this list of valid dimensions

# ... (other strict rules and instructions)

FEW-SHOT EXAMPLES:
{few_shot} # The AI learns from these example questions and their correct Query Plans
"""

SYSTEM_PROMPT = _build_system_prompt() # This prompt is generated once at startup
```
This `_build_system_prompt` function is super important. It dynamically pulls current metrics and dimensions from the registries and combines them with rules and examples into a comprehensive guide for the AI. This way, the AI knows exactly what it's working with and how to respond.

#### 2. Asking the AI Model for a Plan

Once the `SYSTEM_PROMPT` is ready, the `Planner` uses an AI model (like one from OpenAI) to do the actual work of generating the `Query Plan`.

Here's how the `get_query_plan` method in `app/ai/planner.py` uses this prompt:

```python
# From: app/ai/planner.py (inside Planner class)
from openai import AsyncOpenAI
from app.core.config import settings
from app.query_engine.queryplan import QueryPlanV2, QueryType

class Planner:
    def __init__(self):
        # Setup connection to the AI model
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def get_query_plan(self, question: str, intent: QueryType) -> QueryPlanV2:
        response = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL, # Use the configured AI model
            response_format={"type": "json_object"}, # Ensure response is JSON
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT}, # Give the AI its instructions!
                {
                    "role": "user",
                    "content": (
                        f"User query: {question}\n" # The actual question from the user
                        f"Classified intent: {intent}\n" # The type of question (e.g., "incident_query")
                        "Generate QueryPlanV2 JSON and set query_type to the classified intent unless invalid."
                    ),
                },
            ],
            temperature=0 # Makes the AI's responses more consistent (less creative)
        )
        
        content = response.choices[0].message.content # Get the AI's response
        if not content: raise ValueError("No content returned from AI planner")
            
        plan_dict = json.loads(content) # Parse the JSON into a Python dictionary
        plan_dict.setdefault("query_type", intent) # Ensure query_type is set
        return QueryPlanV2.model_validate(plan_dict) # Convert to a structured QueryPlanV2 object
```
This `get_query_plan` function is where the magic happens. It sends your question, along with the `SYSTEM_PROMPT` (the "cheat sheet" with all the rules and valid terms), to the AI model. The AI then processes this and returns a `Query Plan` in JSON format, which `Sentient-log` can then use.

#### 3. Calling the Planner from the API

Finally, the `Sentient-log` API (`app/api/query.py`) is the entry point for your questions. It first determines the general intent of your query and then hands it over to the `Planner`.

```python
# From: app/api/query.py (inside query_logs function)
from fastapi import APIRouter, Depends
from app.ai.planner import Planner
from app.query_engine.intent_classifier import IntentClassifier
# ... other imports ...

router = APIRouter()
planner = Planner() # Initialize our Planner

@router.post("/query")
async def query_logs(payload: QueryRequest, current_user: User = Depends(RequireRole(["viewer"]))):
    try:
        # 1. Intent classification - figures out the general type of question
        intent = IntentClassifier.classify(payload.question)

        # 2. AI planner generates the detailed QueryPlan
        query_plan = await planner.get_query_plan(payload.question, intent)
        
        # ... rest of the query processing pipeline ...
        
    except Exception as e:
        # ... error handling ...
        raise
```
As you can see, the `query_logs` function first uses the `IntentClassifier` to get a rough idea of what you're asking. Then, it calls `planner.get_query_plan()` with your original question and the classified intent. The `query_plan` variable then holds the structured "recipe" that the AI Query Planner generated!

### Conclusion

In this chapter, we've explored the "brain" of `Sentient-log`: the **AI Query Planner**. We learned that:
*   Its main job is to transform your natural language questions into a structured `Query Plan`.
*   It leverages the [Metric and Dimension Registries](02_metric_and_dimension_registries_.md) as its "cheat sheet" to ensure it uses only valid terms.
*   It uses a powerful AI model, guided by a carefully constructed `SYSTEM_PROMPT` and examples, to perform this translation.

You now understand how `Sentient-log` takes your human-readable questions and turns them into precise instructions for the system. Next, we'll dive deeper into the structure of these instructions themselves – the **Query Plan (QueryPlanV2)**!

[Chapter 4: Query Plan (QueryPlanV2)](04_query_plan__queryplanv2__.md)

---
