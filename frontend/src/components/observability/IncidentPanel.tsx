import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock, TrendingUp } from "lucide-react";

interface Incident {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  timestamp: Date;
  description: string;
  metric?: string;
}

interface IncidentPanelProps {
  incidents: Incident[];
  title?: string;
  index?: number;
}

const severityBadge = {
  critical: "bg-red-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white",
};

export function IncidentPanel({
  incidents,
  title = "Recent Incidents",
  index = 0,
}: IncidentPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-lg">
        <CardHeader className="pb-4 border-b border-white/5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <AlertCircle className="h-4 w-4 text-red-400" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {incidents.length > 0 ? (
              incidents.slice(0, 5).map((incident) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 hover:bg-white/[0.02] transition-colors cursor-pointer border-l-2 ${
                    incident.severity === "critical"
                      ? "border-red-500"
                      : incident.severity === "warning"
                        ? "border-amber-500"
                        : "border-blue-500"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-zinc-100">
                          {incident.title}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          {incident.description}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          severityBadge[incident.severity]
                        }`}
                      >
                        {incident.severity.charAt(0).toUpperCase() +
                          incident.severity.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {incident.timestamp.toLocaleTimeString()}
                      </span>
                      {incident.metric && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {incident.metric}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-6 text-center text-zinc-500 text-sm">
                No incidents detected. System is healthy.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
