import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  ShieldCheck,
  FileUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { api } from "@/services/api";
import { IngestEvent } from "@/types";
import { parseLogFileContent, ParsedLogFileSummary } from "@/lib/logParser";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MAX_BATCH_SIZE = 1000;

function chunkEvents(events: IngestEvent[], size: number): IngestEvent[][] {
  const batches: IngestEvent[][] = [];
  for (let i = 0; i < events.length; i += size) {
    batches.push(events.slice(i, i + size));
  }
  return batches;
}

export default function Ingest() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [summary, setSummary] = useState<ParsedLogFileSummary | null>(null);
  const [events, setEvents] = useState<IngestEvent[]>([]);
  const [preview, setPreview] = useState<IngestEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const batches = chunkEvents(events, MAX_BATCH_SIZE);
      for (const batch of batches) {
        await api.ingestLogs({ events: batch });
      }
      return batches.length;
    },
    onSuccess: (batchCount) => {
      setMessage(
        `Inserted ${events.length} parsed event${events.length === 1 ? "" : "s"} across ${batchCount} batch${batchCount === 1 ? "" : "es"}.`,
      );
    },
    onError: (error: any) => {
      setMessage(
        error?.response?.data?.detail || "Failed to submit parsed logs.",
      );
    },
  });

  const canSubmit = useMemo(
    () => events.length > 0 && !mutation.isPending,
    [events.length, mutation.isPending],
  );

  const handleFile = async (file: File | null) => {
    if (!file) return;

    setMessage(null);
    setIsParsing(true);
    setFileName(file.name);

    try {
      const content = await file.text();
      const parsed = parseLogFileContent(file.name, content);
      setEvents(parsed.events);
      setPreview(parsed.preview);
      setSummary(parsed.summary);

      if (parsed.events.length === 0) {
        setMessage("No parseable log entries found in the selected file.");
      } else {
        setMessage(
          `Parsed ${parsed.summary.parsedEvents} event${parsed.summary.parsedEvents === 1 ? "" : "s"} from ${file.name}.`,
        );
      }
    } catch (error: any) {
      setEvents([]);
      setPreview([]);
      setSummary(null);
      setMessage(error?.message || "Failed to parse the selected file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (events.length === 0) {
      setMessage("Choose a log file first.");
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-2">
          <FileText className="h-4 w-4" />
          Log File Ingestion
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Upload a log file, parse it, and insert it into the database
        </h2>
        <p className="text-sm text-zinc-400 mt-1 max-w-3xl">
          Supports JSON, NDJSON, Apache/Nginx access logs, key-value logs, and
          plain-text logs. Parsed entries are transformed into ClickHouse events
          and submitted through your authenticated session.
        </p>
      </motion.div>

      <Card className="border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-2xl">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="flex items-center gap-2 text-zinc-100 font-medium text-base">
            <Upload className="h-4 w-4 text-zinc-400" />
            Choose Log File
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Upload a file and the app will parse each line or JSON record into
            ingest events before sending them to the backend.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt,.json,.ndjson,.log.txt,text/plain,application/json"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-2xl border border-dashed border-white/10 bg-zinc-950/80 px-6 py-8 text-left transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-100">
                  Click to upload a log file
                </div>
                <div className="text-sm text-zinc-500 mt-1">
                  .log, .txt, .json, .ndjson and similar text-based logs work
                  best.
                </div>
              </div>
            </div>
          </button>

          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            <Badge
              variant="outline"
              className="border-white/10 bg-white/5 text-zinc-300"
            >
              JSON / NDJSON
            </Badge>
            <Badge
              variant="outline"
              className="border-white/10 bg-white/5 text-zinc-300"
            >
              Apache / Nginx
            </Badge>
            <Badge
              variant="outline"
              className="border-white/10 bg-white/5 text-zinc-300"
            >
              key=value
            </Badge>
            <Badge
              variant="outline"
              className="border-white/10 bg-white/5 text-zinc-300"
            >
              plain text
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                File
              </div>
              <div className="mt-2 text-sm text-zinc-100 truncate">
                {fileName || "No file selected"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Parsed Events
              </div>
              <div className="mt-2 text-sm text-zinc-100">
                {summary?.parsedEvents ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Skipped Lines
              </div>
              <div className="mt-2 text-sm text-zinc-100">
                {summary?.skippedLines ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">
                Format
              </div>
              <div className="mt-2 text-sm text-zinc-100">
                {summary?.format || "unknown"}
              </div>
            </div>
          </div>

          {message && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 flex items-start gap-3">
              {events.length > 0 ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400 flex-shrink-0" />
              )}
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={!canSubmit || isParsing}
                className="bg-white text-black hover:bg-zinc-200"
              >
                {mutation.isPending ? (
                  <Loader className="mr-2 h-4 w-4" />
                ) : null}
                <ShieldCheck className="h-4 w-4 mr-2" />
                Insert Parsed Logs
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="flex-1 shadow-lg overflow-hidden flex flex-col border-white/5 bg-zinc-950/50 backdrop-blur-md rounded-2xl">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-zinc-100 font-medium text-base">
            Parsed Preview
          </CardTitle>
          <CardDescription className="text-zinc-500">
            Showing the first few parsed events before they are inserted.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          {preview.length > 0 ? (
            <Table>
              <TableHeader className="bg-zinc-900/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-white/5">
                  <TableHead className="text-xs font-medium text-zinc-400 h-10">
                    Timestamp
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-400 h-10">
                    Event Type
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-400 h-10">
                    URL
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-400 h-10">
                    Latency (ms)
                  </TableHead>
                  <TableHead className="text-xs font-medium text-zinc-400 h-10">
                    User Agent
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((event, index) => (
                  <TableRow
                    key={index}
                    className="hover:bg-white/[0.02] border-white/5 transition-colors"
                  >
                    <TableCell className="font-mono text-xs whitespace-nowrap text-zinc-400">
                      {new Date(
                        event.timestamp || new Date().toISOString(),
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-300 text-sm">
                      {event.event_type}
                    </TableCell>
                    <TableCell
                      className="max-w-[260px] truncate text-zinc-300 text-sm"
                      title={event.url}
                    >
                      {event.url}
                    </TableCell>
                    <TableCell className="text-zinc-300 text-sm">
                      {event.latency_ms}
                    </TableCell>
                    <TableCell
                      className="max-w-[260px] truncate text-xs text-zinc-500"
                      title={event.user_agent || ""}
                    >
                      {event.user_agent || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-6 text-zinc-500 text-center mt-10 text-sm">
              Upload a log file to preview the parsed events here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
