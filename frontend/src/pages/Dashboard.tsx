import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/services/api";
import { Loader } from "@/components/ui/loader";
import {
  Activity,
  Clock,
  Zap,
  AlertTriangle,
  TrendingUp,
  Server,
  Gauge,
  BarChart3,
  Database,
  Zap as Lightning,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { motion } from "framer-motion";
import {
  MetricCard,
  ChartCard,
  AISummary,
  IncidentPanel,
} from "@/components/observability";
import { Card, CardContent } from "@/components/ui/card";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item: any = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function Dashboard() {
  const { data: q1, isLoading: l1 } = useQuery({
    queryKey: ["dash-q1"],
    queryFn: () => api.query({ question: "Count total events" }),
  });

  const { data: q2, isLoading: l2 } = useQuery({
    queryKey: ["dash-q2"],
    queryFn: () => api.query({ question: "Average latency overall" }),
  });

  const { data: q3, isLoading: l3 } = useQuery({
    queryKey: ["dash-q3"],
    queryFn: () => api.query({ question: "Show P95 latency" }),
  });

  const { data: q4, isLoading: l4 } = useQuery({
    queryKey: ["dash-q4"],
    queryFn: () => api.query({ question: "Count events by type" }),
  });

  const { data: q5, isLoading: l5 } = useQuery({
    queryKey: ["dash-q5"],
    queryFn: () => api.query({ question: "show latency over time" }),
  });

  const { data: q6, isLoading: l6 } = useQuery({
    queryKey: ["dash-q6"],
    queryFn: () =>
      api.query({ question: "Count events by event_type last 24h" }),
  });

  // Debug logging for q5 response
  useEffect(() => {
    if (q5) {
      console.log("Q5 response:", {
        hasCharts: !!q5.charts,
        chartsData: q5.charts?.data,
        chartsXAxis: q5.charts?.x_axis,
        chartsYAxis: q5.charts?.y_axis,
        hasTable: !!q5.table,
        tableLength: q5.table?.length,
        hasResults: !!q5.results,
        resultsLength: q5.results?.length,
        fullQ5: q5,
      });
    }
  }, [q5]);

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6;

  const totalEvents =
    q1?.results?.[0]?.count_val || q1?.results?.[0]?.count_event_id || 0;
  const avgLatency = Math.round(q2?.results?.[0]?.avg_latency_ms || 0);
  const p95Latency = Math.round(q3?.results?.[0]?.p95_latency_ms || 0);

  const eventsByType = q4?.table || q4?.results || [];
  const latencyTrend = q5?.charts?.data || q5?.table || q5?.results || [];
  const eventTypeDistribution = q6?.table || q6?.results || [];

  // Use the x_axis and y_axis metadata from charts if available, otherwise fallback to auto-detection
  const latencyXAxisKey =
    q5?.charts?.x_axis ||
    (latencyTrend.length
      ? ["minute", "hour", "day", "timestamp"].find(
          (key) => key in latencyTrend[0],
        ) || "timestamp"
      : "timestamp");

  const latencyYAxisKey =
    q5?.charts?.y_axis ||
    (latencyTrend.length
      ? [
          "avg_latency",
          "p95_latency",
          "p99_latency",
          "max_latency",
          "min_latency",
          "avg_latency_ms",
        ].find((key) => key in latencyTrend[0]) || "avg_latency"
      : "avg_latency");

  // Generate mock incidents based on data
  const incidents = [
    {
      id: "1",
      title: "High P95 Latency Detected",
      severity: "warning" as const,
      timestamp: new Date(),
      description: `P95 latency at ${p95Latency}ms (threshold: 500ms)`,
      metric: `+${Math.round(p95Latency - avgLatency)}ms vs avg`,
    },
  ];

  // Generate AI insights
  const insights = [
    `Total of ${totalEvents.toLocaleString()} events processed today.`,
    `Average latency is ${avgLatency}ms, with P95 at ${p95Latency}ms.`,
    `Peak latency spike detected in the last hour. System performing ${
      p95Latency > 500 ? "below optimal" : "within normal"
    } parameters.`,
  ];

  const COLORS = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Activity className="h-8 w-8 text-blue-400" />
            </motion.div>
            System Overview
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time monitoring & analytics dashboard
          </p>
        </div>
        {isLoading && <Loader />}
      </motion.div>

      {/* Key Metrics Grid */}
      <motion.div
        variants={container}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          title="Total Events"
          value={totalEvents}
          icon={<Activity className="h-5 w-5" />}
          trend={{
            value: 12,
            direction: "up",
            label: "last hour",
          }}
          description="24 hour period"
          status="healthy"
          index={0}
        />

        <MetricCard
          title="Avg Latency"
          value={avgLatency}
          unit="ms"
          icon={<Clock className="h-5 w-5" />}
          trend={{
            value: 2,
            direction: "down",
            label: "last hour",
          }}
          description="Overall performance"
          status="healthy"
          index={1}
        />

        <MetricCard
          title="P95 Latency"
          value={p95Latency}
          unit="ms"
          icon={<Zap className="h-5 w-5" />}
          trend={{
            value: 8,
            direction: "up",
            label: "last hour",
          }}
          description={`${p95Latency > 500 ? "Above" : "Below"} threshold`}
          status={p95Latency > 500 ? "critical" : "healthy"}
          index={2}
        />

        <MetricCard
          title="System Status"
          value="Online"
          icon={<Server className="h-5 w-5" />}
          description="All services operational"
          status="healthy"
          index={3}
        />
      </motion.div>

      {/* AI Insights & Incidents Row */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <motion.div variants={item} className="lg:col-span-2">
          <AISummary
            title="System Insights"
            insights={insights}
            keyMetrics={[
              {
                label: "Error Rate",
                value: "0.2%",
                highlight: false,
              },
              {
                label: "Uptime",
                value: "99.98%",
                highlight: true,
              },
              {
                label: "Request Volume",
                value: "2.4K req/min",
                highlight: false,
              },
            ]}
            severity={p95Latency > 500 ? "warning" : "info"}
          />
        </motion.div>

        <motion.div variants={item}>
          <IncidentPanel incidents={incidents} title="Active Alerts" />
        </motion.div>
      </motion.div>

      {/* Charts Row */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Latency Trend */}
        <motion.div variants={item} className="lg:col-span-2">
          <ChartCard
            title="Latency Trend"
            description="Real-time latency progression"
            icon={<TrendingUp className="h-4 w-4" />}
            height="h-[300px]"
          >
            {l5 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                Loading latency data...
              </div>
            ) : latencyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyTrend}>
                  <defs>
                    <linearGradient
                      id="colorLatency"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#27272a"
                    vertical={false}
                  />
                  <XAxis
                    dataKey={latencyXAxisKey}
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
                  <Area
                    type="monotone"
                    dataKey={latencyYAxisKey}
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorLatency)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                <div className="text-center">
                  <p className="mb-1">
                    No latency data available for the selected timeframe.
                  </p>
                  <p className="text-xs text-zinc-400">
                    Ensure events with latency data exist in the last hour
                  </p>
                </div>
              </div>
            )}
          </ChartCard>
        </motion.div>

        {/* Event Distribution */}
        <motion.div variants={item}>
          <ChartCard
            title="Event Types"
            description="Distribution breakdown"
            icon={<BarChart3 className="h-4 w-4" />}
            height="h-[300px]"
          >
            {eventTypeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(data: any) =>
                      `${data.event_type}: ${data.count_event_id}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count_event_id"
                  >
                    {eventTypeDistribution.map((_: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      borderRadius: "8px",
                      color: "#f4f4f5",
                    }}
                    itemStyle={{ color: "#f4f4f5" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                Loading distribution...
              </div>
            )}
          </ChartCard>
        </motion.div>
      </motion.div>

      {/* Events by Type Bar Chart */}
      <motion.div variants={item}>
        <ChartCard
          title="Events by Type (Detailed)"
          description="Full event type breakdown"
          icon={<Database className="h-4 w-4" />}
          height="h-[280px]"
        >
          {eventsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eventsByType}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="event_type"
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
                <Bar
                  dataKey="count_event_id"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              Loading events...
            </div>
          )}
        </ChartCard>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        variants={container}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <motion.div variants={item}>
          <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-md">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Ingestion Rate
                  </span>
                  <Lightning className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-zinc-100">2.4K</div>
                <p className="text-xs text-zinc-500">events per minute</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-md">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Error Rate
                  </span>
                  <AlertTriangle className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-zinc-100">0.2%</div>
                <p className="text-xs text-zinc-500">last 24 hours</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-md">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    System Health
                  </span>
                  <Gauge className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-zinc-100">99.98%</div>
                <p className="text-xs text-zinc-500">uptime</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
