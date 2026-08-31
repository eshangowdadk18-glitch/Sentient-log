"""
Test script to verify latency dashboard query works correctly.
This helps diagnose why the latency trend chart shows "No latency data available".

Usage:
    cd /Users/eshwarsai/Downloads/sentient-log && python -m pytest tests/test_latency_dashboard.py -v
    or
    python tests/test_latency_dashboard.py
"""

import sys
import asyncio
import json
from pathlib import Path
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.query_engine.intent_classifier import IntentClassifier
from app.query_engine.semantic_mapper import SemanticMapper
from app.query_engine.queryplan import QueryPlanV2
from app.query_engine.validator import QueryPlanValidator
from app.analytics.sql_builder import SqlBuilder


def test_latency_query_plan():
    """Test that 'show latency over time' generates correct query plan and SQL."""
    print("\n=== Testing Latency Query Plan ===\n")
    
    query = "show latency over time"
    print(f"Query: {query}")
    
    # Step 1: Intent classification
    intent = IntentClassifier.classify(query)
    secondary = IntentClassifier.classify_secondary(query, intent)
    print(f"Primary intent: {intent}")
    print(f"Secondary intents: {secondary}")
    
    # Step 2: Create basic query plan (what LLM would generate)
    plan = QueryPlanV2(
        metric="latency",
        aggregation="avg",
        query_type=intent,
        group_by=[],
        filters={},
        timeframe="1h",
        limit=100
    )
    print(f"\nInitial plan:")
    print(f"  - metric: {plan.metric}")
    print(f"  - aggregation: {plan.aggregation}")
    print(f"  - query_type: {plan.query_type}")
    print(f"  - group_by: {plan.group_by}")
    
    # Step 3: Semantic mapping
    enriched_plan = SemanticMapper.enrich(query, plan)
    print(f"\nAfter semantic mapping:")
    print(f"  - metric: {enriched_plan.metric}")
    print(f"  - aggregation: {enriched_plan.aggregation}")
    print(f"  - query_type: {enriched_plan.query_type}")
    print(f"  - group_by: {enriched_plan.group_by}")
    print(f"  - order_by: {enriched_plan.order_by}")
    
    # Step 4: Validation
    validator = QueryPlanValidator()
    validation_result = validator.validate(enriched_plan)
    print(f"\nValidation:")
    print(f"  - valid: {validation_result.valid}")
    if not validation_result.valid:
        print(f"  - errors: {[e.model_dump() for e in validation_result.errors]}")
    
    # Step 5: SQL generation
    builder = SqlBuilder(enriched_plan)
    sql = builder.build()
    print(f"\nGenerated SQL:")
    print(f"  {sql}")
    
    # Step 6: Parse SQL to show expected columns
    print(f"\nExpected response columns:")
    if "AS minute" in sql:
        print(f"  - minute (time bucket)")
    if "AS avg_latency" in sql:
        print(f"  - avg_latency (metric value)")
    
    print("\n=== Test Complete ===")
    print("If SQL looks correct, the issue is likely that:")
    print("  1. ClickHouse has no events with latency_ms data")
    print("  2. All events are older than 1 hour")
    print("  3. The database is not populated with test data")


if __name__ == "__main__":
    test_latency_query_plan()
