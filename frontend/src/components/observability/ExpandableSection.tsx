import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import React from "react";

interface ExpandableSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function ExpandableSection({
  title,
  icon,
  children,
  defaultOpen = false,
  className = "",
}: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card
      className={`border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-lg overflow-hidden ${className}`}
    >
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors border-b border-white/5"
      >
        <div className="flex items-center gap-2">
          {icon && <div className="text-zinc-400">{icon}</div>}
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            {title}
          </h3>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
