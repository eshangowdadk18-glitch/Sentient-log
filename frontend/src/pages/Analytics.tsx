import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  Search,
  Code2,
  Database,
  Sparkles,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExpandableSection,
  SuggestedPrompts,
  TableLoadingSkeleton,
  AISummary,
  IncidentPanel,
} from "@/components/observability";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const SUGGESTED_QUERIES = [
  {
    icon: <TrendingUp className="h-4 w-4" />,
    title: "Incidents",
    description: "Find failing services quickly",
    query: "show top failing services",
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    title: "Latency Spikes",
    description: "Identify slow endpoints",
    query: "show top slow endpoints",
  },
  {
    icon: <PieChartIcon className="h-4 w-4" />,
    title: "Auth Failures",
    description: "Investigate login and auth issues",
    query: "show auth failures",
  },
  {
    icon: <Database className="h-4 w-4" />,
    title: "Traffic Trends",
    description: "Track request volume over time",
    query: "show request volume over time",
  },
];

export default function Analytics() {
  const [question, setQuestion] = useState("");

  const queryMutation = useMutation({
    mutationFn: () => api.query({ question }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    queryMutation.mutate();
  };

  const handleSuggestedQuery = (query: string) => {
    setQuestion(query);
    setTimeout(() => {
      queryMutation.mutate();
    }, 100);
  };

  const { data, isPending, isError, error } = queryMutation;
  const tableData = data?.table ?? data?.results ?? [];

  const resultColumns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  // Generate AI summary insights
  const generateInsights = () => {
    if (!data) return [];

    const insights = [data.summary || "Analysis complete."];

    if (data.validation && !data.validation.valid) {
      insights.push("Validation reported issues in the generated query plan.");
    }

    if (data.execution_metadata?.row_count !== undefined) {
      insights.push(`Returned ${data.execution_metadata.row_count} records.`);
    }

    return insights;
  };

  const keyMetrics = () => {
    if (!data?.metrics) return [];

    const cards = [
      {
        label: "Detected",
        value:
          data.metrics.total_value ??
          data.metrics.total_rows ??
          tableData.length,
        highlight: true,
      },
      {
        label: "Metric",
        value: String(
          data.metrics.metric_label ?? data.metrics.metric ?? "n/a",
        ),
      },
      {
        label: "Aggregation",
        value: String(data.metrics.aggregation ?? "n/a"),
      },
      {
        label: "Rows",
        value: Number(data.metrics.total_rows ?? tableData.length),
      },
    ];

    return cards;
  };

  // Attempt to extract numeric data for visualization
  const getVisualizationData = () => {
    if (!data) return [];

    if (data.charts?.data && data.charts.data.length > 0) {
      return data.charts.data.map((row: any, idx: number) => ({
        name:
          row[data.charts.x_axis || "minute"] ||
          row[Object.keys(row)[0]] ||
          `Item ${idx + 1}`,
        value:
          row[data.charts.y_axis || "value"] ??
          row[
            Object.keys(row).find((key) => typeof row[key] === "number") ||
              "value"
          ],
      }));
    }

    if (!tableData || tableData.length === 0) return [];

    // Try to find numeric columns for charting
    const firstRow = tableData[0];
    const numericFields = Object.entries(firstRow)
      .filter(([_, v]) => typeof v === "number")
      .map(([k]) => k);

    if (numericFields.length > 0) {
      return tableData.map((row: any, idx: number) => ({
        name: row[Object.keys(row)[0]] || `Item ${idx + 1}`,
        value: row[numericFields[0]],
      }));
    }

    return [];
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="h-8 w-8 text-blue-400" />
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
            AI Query Console
          </h2>
        </div>
        <p className="text-sm text-zinc-400">
          Ask natural language questions about your logs and metrics. AI-powered
          query generation.
        </p>
      </motion.div>

      {/* Query Input - Chat-like Experience */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-30" />
        <Card className="relative bg-zinc-950/80 border-white/10 rounded-xl overflow-hidden backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="flex p-3 gap-2">
            <div className="relative flex-1 flex items-center">
              <Sparkles className="absolute left-4 h-5 w-5 text-blue-400" />
              <Input
                placeholder="E.g., show top failing services, show auth failures, show request volume over time"
                className="pl-12 h-12 bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-zinc-500"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={isPending || !question.trim()}
              className="h-12 px-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              {isPending ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Query
                </>
              )}
            </Button>
          </form>
        </Card>
      </motion.div>

      {/* Suggested Prompts - Only show when no results yet */}
      <AnimatePresence>
        {!data && !isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <SuggestedPrompts
              prompts={SUGGESTED_QUERIES}
              onPromptSelect={handleSuggestedQuery}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-red-500/20 bg-red-500/10 rounded-lg">
            <CardContent className="pt-6 text-red-400">
              <p className="font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Query Failed
              </p>
              <p className="text-sm mt-2 text-red-400/80">
                {(error as any)?.response?.data?.detail || error.message}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Results Layout - Premium analytics experience */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 flex-1 overflow-auto"
        >
          {/* AI Summary/Insights */}
          <AISummary
            title="Operational Summary"
            insights={generateInsights()}
            keyMetrics={keyMetrics()}
            severity={data.incidents?.length ? "warning" : "info"}
          />

          <IncidentPanel
            title="Detected Incidents"
            incidents={(data.incidents || []).map((incident, index) => ({
              id: `incident-${index}`,
              title: incident.title,
              severity:
                incident.severity === "critical"
                  ? "critical"
                  : incident.severity === "warning"
                    ? "warning"
                    : "info",
              timestamp: new Date(),
              description: incident.description,
              metric: String(
                data.metrics?.metric_label || data.metrics?.metric || "",
              ),
            }))}
          />

          {/* Visualization (if data supports it) */}
          {getVisualizationData().length > 0 && (
            <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-lg">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="flex items-center gap-2 text-zinc-100 font-medium text-base">
                  <BarChart3 className="h-4 w-4 text-blue-400" />
                  Quick Visualization
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Visual representation of query results
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getVisualizationData()}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#71717a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#27272a", opacity: 0.4 }}
                      contentStyle={{
                        backgroundColor: "#09090b",
                        borderColor: "#27272a",
                        borderRadius: "8px",
                        color: "#f4f4f5",
                      }}
                      itemStyle={{ color: "#f4f4f5" }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Results Table - Main focus */}
          <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-lg overflow-hidden flex flex-col flex-1">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-zinc-100 font-medium text-base">
                <Database className="h-4 w-4 text-blue-400" />
                Query Results
              </CardTitle>
              <CardDescription className="text-zinc-500">
                {`${Math.round(Number(data.metrics?.total_value || data.metrics?.total_rows || tableData.length))} ${String(data.metrics?.metric_label || "records")} detected`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {tableData.length > 0 ? (
                <Table>
                  <TableHeader className="bg-zinc-900/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-white/5">
                      {resultColumns.map((col) => (
                        <TableHead
                          key={col}
                          className="text-xs font-medium text-zinc-400 h-10 px-4"
                        >
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((row, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-white/[0.02] border-b border-white/5 transition-colors"
                      >
                        {resultColumns.map((col) => (
                          <TableCell
                            key={`${i}-${col}`}
                            className="text-sm text-zinc-300 py-3 px-4"
                          >
                            {typeof row[col] === "object"
                              ? JSON.stringify(row[col])
                              : String(row[col])}
                          </TableCell>
                        ))}
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
                  No results found for this query.
                </div>
              )}
            </CardContent>
          </Card>

          {/* SQL & Query Plan - Collapsible sections */}
          <div className="space-y-4">
            <ExpandableSection
              title="Generated SQL"
              icon={<Code2 className="h-4 w-4" />}
              defaultOpen={false}
            >
              <pre className="p-4 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono overflow-x-auto text-blue-300 max-h-[300px] overflow-y-auto">
                {data.sql}
              </pre>
            </ExpandableSection>

            <ExpandableSection
              title="Query Execution Plan"
              icon={<Database className="h-4 w-4" />}
              defaultOpen={false}
            >
              <pre className="p-4 rounded-lg bg-zinc-900 border border-white/10 text-xs font-mono overflow-x-auto text-zinc-400 max-h-[300px] overflow-y-auto">
                {JSON.stringify(data.query_plan, null, 2)}
              </pre>
            </ExpandableSection>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isPending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4 flex-1"
        >
          <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-zinc-100 text-base">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-4 w-4 text-blue-400" />
                </motion.div>
                Analyzing your query...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TableLoadingSkeleton />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
