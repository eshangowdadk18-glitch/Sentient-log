import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import {
  Search,
  RotateCw,
  AlertTriangle,
  CheckCircle,
  Info,
  AlertCircle,
  ChevronDown,
  Terminal,
} from "lucide-react";
import {
  LogSeverityBadge,
  type LogSeverity,
  MetricCard,
} from "@/components/observability";

const getSeverityFromLatency = (latency: number): LogSeverity => {
  if (latency > 1000) return "error";
  if (latency > 500) return "warning";
  return "success";
};

export default function Logs() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchFilter, setSearchFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<LogSeverity | "all">(
    "all",
  );
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["logs-explorer"],
    queryFn: () => api.recentLogs(),
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });

  // Filter logs based on search and severity
  const filteredLogs = useMemo(() => {
    if (!data?.results) return [];

    return data.results.filter((log: any) => {
      const matchesSearch =
        !searchFilter ||
        log.url?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        log.event_type?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        log.user_agent?.toLowerCase().includes(searchFilter.toLowerCase());

      const logSeverity = getSeverityFromLatency(log.latency_ms);
      const matchesSeverity =
        severityFilter === "all" || logSeverity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [data?.results, searchFilter, severityFilter]);

  // Generate log statistics
  const stats = useMemo(() => {
    if (!data?.results)
      return { total: 0, errors: 0, warnings: 0, avgLatency: 0 };

    const results = data.results as any[];
    const errors = results.filter(
      (log) => getSeverityFromLatency(log.latency_ms) === "error",
    ).length;
    const warnings = results.filter(
      (log) => getSeverityFromLatency(log.latency_ms) === "warning",
    ).length;
    const avgLatency = Math.round(
      results.reduce((sum, log) => sum + log.latency_ms, 0) / results.length,
    );

    return {
      total: results.length,
      errors,
      warnings,
      avgLatency,
    };
  }, [data?.results]);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 h-full flex flex-col"
    >
      {/* Header */}
      <motion.div variants={item} className="space-y-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Terminal className="h-8 w-8 text-green-400" />
          </motion.div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
            Logs Explorer
          </h2>
        </div>
        <p className="text-sm text-zinc-400">
          Advanced log searching & filtering. Auto-refreshes every 30s.
        </p>
      </motion.div>

      {/* Stats Cards */}
      {isAuthenticated && !isLoading && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-3 md:grid-cols-4"
        >
          <MetricCard
            title="Total Logs"
            value={stats.total}
            icon={<Info className="h-4 w-4" />}
            description="24 hour period"
            index={0}
          />

          <MetricCard
            title="Errors"
            value={stats.errors}
            icon={<AlertCircle className="h-4 w-4" />}
            status={stats.errors > 0 ? "critical" : "healthy"}
            description="Latency > 1s"
            index={1}
          />

          <MetricCard
            title="Warnings"
            value={stats.warnings}
            icon={<AlertTriangle className="h-4 w-4" />}
            status={stats.warnings > 0 ? "warning" : "healthy"}
            description="Latency 500-1000ms"
            index={2}
          />

          <MetricCard
            title="Avg Latency"
            value={stats.avgLatency}
            unit="ms"
            icon={<CheckCircle className="h-4 w-4" />}
            description="Average response time"
            status={stats.avgLatency > 500 ? "warning" : "healthy"}
            index={3}
          />
        </motion.div>
      )}

      {/* Filters & Search */}
      <motion.div
        variants={item}
        className="flex gap-3 flex-col md:flex-row md:items-end"
      >
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by URL, event type, user agent..."
            className="pl-10 h-10 bg-zinc-900/50 border-white/10 focus-visible:border-blue-500"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        {/* Severity Filter */}
        <div className="flex gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="h-10 px-3 rounded-lg bg-zinc-900/50 border border-white/10 text-sm text-zinc-200 focus:border-blue-500 outline-none transition-colors"
          >
            <option value="all">All Severity</option>
            <option value="error">Errors Only</option>
            <option value="warning">Warnings</option>
            <option value="success">Healthy</option>
          </select>
        </div>

        {/* Refresh Button */}
        <Button
          onClick={() => refetch()}
          disabled={isLoading}
          variant="outline"
          className="h-10 px-4 border-white/10 hover:border-blue-500"
        >
          {isLoading ? (
            <>
              <Loader className="mr-2 h-4 w-4" />
              Loading...
            </>
          ) : (
            <>
              <RotateCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </motion.div>

      {/* Logs Table */}
      <motion.div
        variants={item}
        className="flex-1 overflow-hidden flex flex-col"
      >
        <Card className="flex-1 shadow-lg overflow-hidden flex flex-col border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-lg">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-zinc-100 font-medium text-base">
              Recent Logs
            </CardTitle>
            <CardDescription className="text-zinc-500">
              {filteredLogs.length} logs
              {searchFilter && ` (filtered from ${data?.results?.length || 0})`}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 overflow-auto p-0">
            {!isAuthenticated ? (
              <div className="p-6 text-zinc-400 text-sm">
                Sign in to load logs. The logs explorer requires an
                authenticated session.
              </div>
            ) : isError ? (
              <div className="p-6 text-red-400">
                Failed to fetch logs from ClickHouse. The backend is reachable,
                so this is usually a session or database issue.
              </div>
            ) : filteredLogs.length > 0 ? (
              <Table>
                <TableHeader className="bg-zinc-900/50 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="text-xs font-medium text-zinc-400 h-10 w-8" />
                    <TableHead className="text-xs font-medium text-zinc-400 h-10 px-4">
                      Severity
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-400 h-10 px-4">
                      Timestamp
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-400 h-10 px-4">
                      Event Type
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-400 h-10 px-4">
                      URL
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-400 h-10 px-4">
                      Latency
                    </TableHead>
                    <TableHead className="text-xs font-medium text-zinc-400 h-10 px-4">
                      User Agent
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: any, i: number) => {
                    const severity = getSeverityFromLatency(log.latency_ms);
                    const isExpanded = expandedLog === i;

                    return (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-white/5 transition-colors group"
                      >
                        <TableCell className="w-8 p-0 text-center">
                          <button
                            onClick={() =>
                              setExpandedLog(isExpanded ? null : i)
                            }
                            className="p-2 hover:bg-white/5 transition-colors"
                          >
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-4 w-4 text-zinc-500" />
                            </motion.div>
                          </button>
                        </TableCell>

                        <TableCell className="px-4 py-3">
                          <LogSeverityBadge severity={severity} />
                        </TableCell>

                        <TableCell className="font-mono text-xs whitespace-nowrap text-zinc-400 px-4 py-3">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>

                        <TableCell className="px-4 py-3">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {log.event_type}
                          </span>
                        </TableCell>

                        <TableCell
                          className="max-w-[250px] truncate text-zinc-300 text-sm px-4 py-3"
                          title={log.url}
                        >
                          <code className="text-xs">{log.url}</code>
                        </TableCell>

                        <TableCell className="px-4 py-3">
                          <span
                            className={`font-mono text-sm font-medium ${
                              log.latency_ms > 1000
                                ? "text-red-400"
                                : log.latency_ms > 500
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}
                          >
                            {log.latency_ms}ms
                          </span>
                        </TableCell>

                        <TableCell
                          className="max-w-[150px] truncate text-xs text-zinc-500 px-4 py-3"
                          title={log.user_agent}
                        >
                          {log.user_agent || "N/A"}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              !isLoading && (
                <div className="p-6 text-zinc-500 text-center mt-10 text-sm">
                  {searchFilter || severityFilter !== "all"
                    ? "No logs match your filters."
                    : "No logs found."}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Log Details Popup */}
      {expandedLog !== null && filteredLogs[expandedLog] && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mt-4"
        >
          <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-md rounded-lg">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Log Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(filteredLogs[expandedLog]).map(
                  ([key, value]) => (
                    <div key={key}>
                      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        {key}
                      </p>
                      <p className="text-sm text-zinc-300 mt-1 break-all">
                        {typeof value === "object"
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
