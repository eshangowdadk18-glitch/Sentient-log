import { motion } from "framer-motion";

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="space-y-2"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <div className="h-4 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
        </motion.div>
      ))}
    </div>
  );
}

export function TableLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="flex gap-4 p-4 border-b border-white/5"
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.1,
          }}
        >
          <div className="h-4 bg-zinc-800 rounded w-1/6" />
          <div className="h-4 bg-zinc-800 rounded w-1/6" />
          <div className="h-4 bg-zinc-800 rounded w-1/6" />
          <div className="h-4 bg-zinc-800 rounded w-1/6" />
          <div className="h-4 bg-zinc-800 rounded w-1/6" />
        </motion.div>
      ))}
    </div>
  );
}

export function ChartLoadingSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      >
        <div className="h-3 bg-zinc-800 rounded w-64" />
        <div className="h-3 bg-zinc-800 rounded w-48" />
      </motion.div>
    </div>
  );
}
