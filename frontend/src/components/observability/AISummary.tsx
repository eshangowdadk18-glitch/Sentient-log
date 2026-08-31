import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, AlertCircle, Zap } from "lucide-react";

interface AISummaryProps {
  title?: string;
  insights: string[];
  keyMetrics?: {
    label: string;
    value: string | number;
    highlight?: boolean;
  }[];
  severity?: "info" | "warning" | "critical";
  index?: number;
}

const severityColors = {
  info: "bg-blue-500/10 border-blue-500/20 text-blue-300",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-300",
  critical: "bg-red-500/10 border-red-500/20 text-red-300",
};

const severityIcons = {
  info: <Sparkles className="h-5 w-5" />,
  warning: <AlertCircle className="h-5 w-5" />,
  critical: <Zap className="h-5 w-5" />,
};

export function AISummary({
  title = "AI Insights",
  insights,
  keyMetrics,
  severity = "info",
  index = 0,
}: AISummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className={`border-white/5 ${severityColors[severity]} rounded-lg`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {severityIcons[severity]}
            <CardTitle className="text-sm font-semibold text-zinc-100">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Insights */}
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="text-sm leading-relaxed text-zinc-300"
              >
                • {insight}
              </motion.p>
            ))}
          </div>

          {/* Key Metrics */}
          {keyMetrics && keyMetrics.length > 0 && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              {keyMetrics.map((metric, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-zinc-400">{metric.label}</span>
                  <span
                    className={`font-semibold ${
                      metric.highlight ? "text-white" : "text-zinc-300"
                    }`}
                  >
                    {metric.value}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
