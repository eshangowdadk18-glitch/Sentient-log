from fastapi import APIRouter, HTTPException, Depends, Request
import logging
from app.schemas.query import QueryRequest, QueryResponse
from app.ai.planner import Planner
from app.analytics.sql_builder import SqlBuilder, SqlBuilderError
from app.clickhouse.client import get_client
from app.query_engine.insights import generate_insights
from app.query_engine.intent_classifier import IntentClassifier
from app.query_engine.semantic_mapper import SemanticMapper
from app.query_engine.validator import QueryPlanValidator
from app.query_engine.mock_responses import get_mock_response
from app.auth.dependencies import RequireRole
from app.auth.models import User, AuditLog

logger = logging.getLogger(__name__)
router = APIRouter()
planner = Planner()
validator = QueryPlanValidator()

@router.post("/query", response_model=QueryResponse)
async def query_logs(
    payload: QueryRequest,
    request: Request,
    current_user: User = Depends(RequireRole(["admin", "analyst", "viewer"]))
):
    try:
        # 1. Intent classification
        intent = IntentClassifier.classify(payload.question)
        intent_tags = IntentClassifier.classify_secondary(payload.question, intent)

        # 2. AI planner generates constrained QueryPlan V2
        try:
            query_plan = await planner.get_query_plan(payload.question, intent)
            query_plan.intent_tags = intent_tags
        except Exception as planner_error:
            # If LLM hits rate limit or other error, try mock response
            error_str = str(planner_error).lower()
            if "rate_limit" in error_str or "429" in str(planner_error):
                logger.warning(f"LLM rate limit hit, using mock response for: {payload.question}")
                mock_response = get_mock_response(payload.question)
                if mock_response:
                    # Log mock usage
                    client_host = request.client.host if request.client else None
                    audit_log = AuditLog(
                        user_id=str(current_user.id),
                        role=current_user.role,
                        query=payload.question,
                        query_plan=mock_response.get("query_plan", {}),
                        generated_sql="MOCK",
                        validation_results={"valid": True},
                        execution_metadata={"mock": True, "row_count": len(mock_response.get("results", []))},
                        intent=intent,
                        ip_address=client_host
                    )
                    try:
                        await audit_log.insert()
                    except:
                        pass  # Audit logging is non-critical
                    
                    return QueryResponse(**mock_response)
            # If no mock available or different error, re-raise
            raise

        # 3. Semantic mapping layer normalizes observability terms
        query_plan = SemanticMapper.enrich(payload.question, query_plan)

        # 4. Validation engine enforces safety and schema correctness
        validation_result = validator.validate(query_plan)
        if not validation_result.valid:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Query plan validation failed",
                    "errors": [error.model_dump() for error in validation_result.errors],
                },
            )

        logger.info(f"Generated QueryPlan: {query_plan.model_dump_json()}")

        # 5. Deterministic SQL generation
        builder = SqlBuilder(query_plan)
        sql = builder.build()
        logger.info(f"Generated SQL: {sql}")

        # 6. Execute on ClickHouse
        client = await get_client()
        result_set = await client.query(sql)

        # Format results to list of dicts
        results = []
        if result_set.result_rows:
            columns = result_set.column_names
            for row in result_set.result_rows:
                results.append(dict(zip(columns, row)))

        # 7. Insight generation layer
        insight_payload = generate_insights(payload.question, query_plan, results)

        execution_metadata = {
            "row_count": len(results),
            "intent": intent,
            "intent_tags": intent_tags,
            "result_columns": list(results[0].keys()) if results else [],
        }

        # 8. Audit logging for replay/debug/compliance
        client_host = request.client.host if request.client else None
        audit_log = AuditLog(
            user_id=str(current_user.id),
            role=current_user.role,
            query=payload.question,
            query_plan=query_plan.model_dump(),
            generated_sql=sql,
            validation_results=validation_result.model_dump(),
            execution_metadata=execution_metadata,
            intent=intent,
            ip_address=client_host
        )
        await audit_log.insert()

        return QueryResponse(
            question=payload.question,
            query_plan=query_plan,
            sql=sql,
            results=results,
            summary=insight_payload["summary"],
            metrics=insight_payload["metrics"],
            charts=insight_payload["charts"],
            table=insight_payload["table"],
            incidents=insight_payload["incidents"],
            validation=validation_result.model_dump(),
            execution_metadata=execution_metadata,
        )
    except SqlBuilderError as e:
        raise HTTPException(status_code=400, detail=f"Invalid query plan: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
