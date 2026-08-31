import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface SuggestedPromptProps {
  prompts: {
    icon: React.ReactNode;
    title: string;
    description: string;
    query: string;
  }[];
  onPromptSelect: (query: string) => void;
}

export function SuggestedPrompts({
  prompts,
  onPromptSelect,
}: SuggestedPromptProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-medium text-zinc-300">Suggested Queries</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {prompts.map((prompt, idx) => (
          <motion.div
            key={idx}
            variants={item}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() => onPromptSelect(prompt.query)}
              className="p-3 cursor-pointer border-white/10 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-white/20 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="text-blue-400 group-hover:scale-110 transition-transform">
                  {prompt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                    {prompt.title}
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 group-hover:text-zinc-400 transition-colors line-clamp-2">
                    {prompt.description}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
