import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

export type LogSeverity = "error" | "warning" | "info" | "success" | "debug";

interface LogSeverityBadgeProps {
  severity: LogSeverity;
  label?: string;
}

const severityConfig: Record<
  LogSeverity,
  {
    className: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  error: {
    className:
      "bg-red-500/20 text-red-300 border-red-500/50 hover:bg-red-500/30",
    icon: <AlertCircle className="h-3 w-3" />,
    label: "ERROR",
  },
  warning: {
    className:
      "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30",
    icon: <AlertTriangle className="h-3 w-3" />,
    label: "WARNING",
  },
  info: {
    className:
      "bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30",
    icon: <Info className="h-3 w-3" />,
    label: "INFO",
  },
  success: {
    className:
      "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30",
    icon: <CheckCircle className="h-3 w-3" />,
    label: "SUCCESS",
  },
  debug: {
    className:
      "bg-zinc-500/20 text-zinc-300 border-zinc-500/50 hover:bg-zinc-500/30",
    icon: <Info className="h-3 w-3" />,
    label: "DEBUG",
  },
};

export function LogSeverityBadge({ severity, label }: LogSeverityBadgeProps) {
  const config = severityConfig[severity];

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1 font-mono text-xs ${config.className}`}
    >
      {config.icon}
      <span>{label || config.label}</span>
    </Badge>
  );
}
