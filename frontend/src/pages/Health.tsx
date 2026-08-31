import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { Activity, Database, Server, Cpu } from "lucide-react";

export default function Health() {
  const {
    data: health,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const getStatusBadge = (status?: string) => {
    if (status === "ok" || status === "up")
      return <Badge variant="success">Operational</Badge>;
    if (status === "error" || status === "down")
      return <Badge variant="destructive">Down</Badge>;
    if (status === "degraded") return <Badge variant="warning">Degraded</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Health</h2>
          <p className="text-muted-foreground">
            Live polling of backend components status (10s).
          </p>
        </div>
        {isLoading && <Loader />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Global Status */}
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall System
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              {isError ? (
                <Badge variant="destructive">Offline</Badge>
              ) : (
                getStatusBadge(health?.status)
              )}
            </div>
            {health?.details && (
              <p className="text-xs text-muted-foreground mt-2">
                {health.details}
              </p>
            )}
          </CardContent>
        </Card>

        {/* API Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              FastAPI Service
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              {getStatusBadge(health?.components?.api || health?.status)}
            </div>
          </CardContent>
        </Card>

        {/* ClickHouse Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              ClickHouse Database
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              {getStatusBadge(health?.components?.clickhouse)}
            </div>
          </CardContent>
        </Card>

        {/* Worker Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingestion Worker
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              {getStatusBadge(health?.components?.ingestion_worker)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
