import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import React from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  height?: string;
  index?: number;
  className?: string;
}

export function ChartCard({
  title,
  description,
  icon,
  children,
  height = "h-[300px]",
  index = 0,
  className = "",
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -2 }}
    >
      <Card
        className={`border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-lg overflow-hidden ${className}`}
      >
        <CardHeader className="pb-4 border-b border-white/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                {icon && <div className="text-zinc-400">{icon}</div>}
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  {title}
                </CardTitle>
              </div>
              {description && (
                <CardDescription className="text-xs text-zinc-500 mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className={`${height} p-4`}>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
