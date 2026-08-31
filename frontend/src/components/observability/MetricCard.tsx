import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
    label: string;
  };
  description?: string;
  status?: "healthy" | "warning" | "critical";
  index?: number;
}

const statusColors = {
  healthy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

export function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  description,
  status = "healthy",
  index = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card
        className={`border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-lg hover:border-white/10 transition-all duration-300 ${
          statusColors[status]
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              {title}
            </CardTitle>
            {icon && <div className="text-zinc-500">{icon}</div>}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold text-zinc-100">{value}</div>
            {unit && <div className="text-lg text-zinc-500">{unit}</div>}
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3 text-amber-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-emerald-400" />
              )}
              <span
                className={
                  trend.direction === "up"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }
              >
                {trend.direction === "up" ? "+" : "-"}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-zinc-500">{trend.label}</span>
            </div>
          )}
          {description && (
            <p className="text-xs text-zinc-500">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
