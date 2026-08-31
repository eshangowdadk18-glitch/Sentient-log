# SentientLog

The `Sentient-log` project is an **AI-powered observability platform** designed to help users understand their application logs by asking questions in *plain English*. It automatically translates these questions into detailed plans and then into **database queries** for fast analysis in a ClickHouse database, while also handling the *secure ingestion* of new log data and user authentication.


## Visual Overview

```mermaid
flowchart TD
    A0["Query Plan (QueryPlanV2)
"]
    A1["AI Query Planner
"]
    A2["Semantic Mapper
"]
    A3["SQL Builder
"]
    A4["Ingestion System
"]
    A5["Metric and Dimension Registries
"]
    A6["ClickHouse Manager
"]
    A7["Authentication & Authorization
"]
    A1 -- "Generates" --> A0
    A2 -- "Enriches" --> A0
    A3 -- "Consumes" --> A0
    A1 -- "Consults" --> A5
    A2 -- "Consults" --> A5
    A3 -- "Uses for Translation" --> A5
    A4 -- "Inserts Data via" --> A6
    A6 -- "Executes SQL from" --> A3
    A7 -- "Authorizes Access for" --> A4
    A7 -- "Authorizes Access for" --> A1
    A7 -- "Audits" --> A0
```

## Chapters

1. [Authentication & Authorization
](docs/01_authentication___authorization_.md)
2. [Metric and Dimension Registries
](docs/02_metric_and_dimension_registries_.md)
3. [AI Query Planner
](docs/03_ai_query_planner_.md)
4. [Query Plan (QueryPlanV2)
](docs/04_query_plan__queryplanv2__.md)
5. [Semantic Mapper
](docs/05_semantic_mapper_.md)
6. [SQL Builder
](docs/06_sql_builder_.md)
7. [ClickHouse Manager
](docs/07_clickhouse_manager_.md)
8. [Ingestion System
](docs/08_ingestion_system_.md)

---