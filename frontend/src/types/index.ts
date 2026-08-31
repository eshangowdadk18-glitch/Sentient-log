export interface QueryRequest {
  question: string;
}

export interface IngestEvent {
  event_type: string;
  url: string;
  latency_ms: number;
  timestamp?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

export interface IngestPayload {
  events: IngestEvent[];
}

export interface OrderBy {
  field: string;
  direction: "asc" | "desc";
}

export interface QueryPlan {
  query_type:
    | "aggregation_query"
    | "timeseries_query"
    | "ranking_query"
    | "filtering_query"
    | "incident_query"
    | "latency_query"
    | "comparison_query";
  intent_tags?: (
    | "aggregation_query"
    | "timeseries_query"
    | "ranking_query"
    | "filtering_query"
    | "incident_query"
    | "latency_query"
    | "comparison_query"
  )[];
  metric: string;
  aggregation: "avg" | "count" | "sum" | "min" | "max" | "p95" | "p99";
  filters: Record<string, any>;
  group_by: string[];
  order_by?: OrderBy;
  limit: number;
  timeframe: string;
}

export interface QueryResponse {
  question: string;
  query_plan: QueryPlan;
  sql: string;
  results: Record<string, any>[];
  summary: string;
  metrics: Record<string, any>;
  charts: {
    recommended?: "line" | "bar" | string;
    x_axis?: string;
    y_axis?: string;
    data?: Record<string, any>[];
    [key: string]: any;
  };
  table: Record<string, any>[];
  incidents: {
    severity: "info" | "warning" | "critical" | string;
    title: string;
    description: string;
  }[];
  validation: {
    valid: boolean;
    errors: { field: string; code: string; message: string }[];
  };
  execution_metadata: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  event_type: string;
  url: string;
  latency_ms: number;
  user_agent: string;
  event_id: string;
  [key: string]: any;
}

export interface HealthStatus {
  status: "ok" | "error" | "degraded";
  components?: {
    api?: string;
    clickhouse?: string;
    ingestion_worker?: string;
  };
  details?: string;
}
