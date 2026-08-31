import { IngestEvent } from "@/types";

export interface ParsedLogFileSummary {
  fileName: string;
  totalLines: number;
  parsedEvents: number;
  skippedLines: number;
  format: string;
}

export interface ParsedLogFileResult {
  events: IngestEvent[];
  summary: ParsedLogFileSummary;
  preview: IngestEvent[];
}

type MaybeRecord = Record<string, any>;

const COMMON_TIMESTAMP_REGEX =
  /^(?<timestamp>\d{4}-\d{2}-\d{2}[T\s][^\s]+)\s+(?<level>[A-Z]+)\s+(?<message>.*)$/;

const BRACKET_TIMESTAMP_REGEX =
  /^\[(?<timestamp>[^\]]+)\]\s*(?<level>[A-Z]+)?\s*(?<message>.*)$/;

const COMMON_LOG_REGEX =
  /^(?<ip>\S+) \S+ \S+ \[(?<timestamp>[^\]]+)\] "(?<method>[A-Z]+) (?<url>\S+)(?: HTTP\/[0-9.]+)?" (?<status>\d{3}) (?<bytes>\d+|-) "(?<referrer>[^"]*)" "(?<ua>[^"]*)"(?:\s+(?<duration>[\d.]+))?$/;

function tryParseJson(value: string): MaybeRecord | MaybeRecord[] | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseTimestamp(value?: string): string {
  if (!value) return new Date().toISOString();

  const trimmed = value.trim();
  const variants = [
    trimmed,
    trimmed.replace(/:(\d{2}:\d{2}\s[+-]\d{4})$/, " $1"),
  ];

  for (const candidate of variants) {
    const date = new Date(candidate);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return new Date().toISOString();
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.+-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function inferEventType(
  record: MaybeRecord,
  rawLine: string,
  statusCode?: number,
): string {
  if (typeof record.event_type === "string" && record.event_type.trim())
    return record.event_type.trim();
  if (typeof record.type === "string" && record.type.trim())
    return record.type.trim();
  if (typeof record.level === "string" && record.level.trim())
    return record.level.trim().toLowerCase();

  const lowered = rawLine.toLowerCase();
  if (statusCode && statusCode >= 500) return "http_error";
  if (statusCode && statusCode >= 400) return "http_client_error";
  if (lowered.includes("error")) return "error";
  if (lowered.includes("warn")) return "warning";
  if (lowered.includes("auth")) return "auth";

  return "log_entry";
}

function inferUrl(
  record: MaybeRecord,
  rawLine: string,
  commonMatch?: RegExpMatchArray,
): string {
  const candidates = [record.url, record.path, record.endpoint, record.route];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim())
      return candidate.trim();
  }

  if (commonMatch?.groups?.url) {
    return commonMatch.groups.url;
  }

  const urlMatch = rawLine.match(
    /https?:\/\/[^\s"']+|\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*/,
  );
  if (urlMatch?.[0]) return urlMatch[0];

  return "/";
}

function inferLatencyMs(
  record: MaybeRecord,
  rawLine: string,
  commonMatch?: RegExpMatchArray,
): number {
  const keys = [
    "latency_ms",
    "duration_ms",
    "response_time_ms",
    "elapsed_ms",
    "duration",
    "latency",
    "response_time",
    "rt",
    "time_taken",
  ];

  for (const key of keys) {
    const value = record[key];
    const parsed = toNumber(value);
    if (parsed !== undefined) {
      if (
        typeof value === "string" &&
        /s$/.test(value.trim()) &&
        !/ms$/.test(value.trim())
      ) {
        return parsed * 1000;
      }
      return parsed;
    }
  }

  if (commonMatch?.groups?.duration) {
    return Number(commonMatch.groups.duration) || 0;
  }

  const msMatch = rawLine.match(/(\d+(?:\.\d+)?)\s*ms\b/i);
  if (msMatch?.[1]) return Number(msMatch[1]) || 0;

  return 0;
}

function inferUserAgent(
  record: MaybeRecord,
  commonMatch?: RegExpMatchArray,
): string {
  const candidates = [
    record.user_agent,
    record.ua,
    record.agent,
    record.userAgent,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim())
      return candidate.trim();
  }

  if (commonMatch?.groups?.ua) return commonMatch.groups.ua;

  return "";
}

function extractMetadata(
  record: MaybeRecord,
  rawLine: string,
): Record<string, any> {
  const metadata: Record<string, any> = { raw_line: rawLine };
  const reserved = new Set([
    "event_type",
    "type",
    "url",
    "path",
    "endpoint",
    "route",
    "latency_ms",
    "duration_ms",
    "response_time_ms",
    "elapsed_ms",
    "duration",
    "latency",
    "response_time",
    "rt",
    "time_taken",
    "timestamp",
    "time",
    "ts",
    "date",
    "datetime",
    "user_agent",
    "ua",
    "agent",
    "userAgent",
  ]);

  for (const [key, value] of Object.entries(record)) {
    if (!reserved.has(key) && value !== undefined) {
      metadata[key] = value;
    }
  }

  return metadata;
}

function convertRecord(
  record: MaybeRecord,
  rawLine: string,
  sourceFormat: string,
): IngestEvent {
  const commonMatch = rawLine.match(COMMON_LOG_REGEX) || undefined;
  const statusCode = commonMatch?.groups?.status
    ? Number(commonMatch.groups.status)
    : undefined;
  const timestamp = parseTimestamp(
    (typeof record.timestamp === "string" && record.timestamp) ||
      (typeof record.time === "string" && record.time) ||
      (typeof record.ts === "string" && record.ts) ||
      (typeof record.date === "string" && record.date) ||
      (typeof record.datetime === "string" && record.datetime) ||
      commonMatch?.groups?.timestamp ||
      undefined,
  );

  return {
    event_type: inferEventType(record, rawLine, statusCode),
    url: inferUrl(record, rawLine, commonMatch),
    latency_ms: inferLatencyMs(record, rawLine, commonMatch),
    timestamp,
    user_agent: inferUserAgent(record, commonMatch),
    metadata: {
      source_format: sourceFormat,
      status_code: statusCode,
      ...extractMetadata(record, rawLine),
    },
  };
}

function parseKeyValueLine(line: string): MaybeRecord | null {
  const matches = [...line.matchAll(/([a-zA-Z0-9_.-]+)=("[^"]*"|\S+)/g)];
  if (matches.length === 0) return null;

  const record: MaybeRecord = {};
  for (const match of matches) {
    const key = match[1];
    const rawValue = match[2];
    record[key] =
      rawValue.startsWith('"') && rawValue.endsWith('"')
        ? rawValue.slice(1, -1)
        : rawValue;
  }

  return record;
}

function parsePlainTextLine(line: string): MaybeRecord {
  const levelMatch = line.match(
    /\b(trace|debug|info|warn|warning|error|fatal|critical)\b/i,
  );
  const tsMatch =
    line.match(COMMON_TIMESTAMP_REGEX) || line.match(BRACKET_TIMESTAMP_REGEX);
  const eventType = levelMatch?.[1]?.toLowerCase() || "log_entry";

  return {
    event_type: eventType,
    url: inferUrl({}, line),
    latency_ms: 0,
    timestamp: tsMatch?.groups?.timestamp
      ? parseTimestamp(tsMatch.groups.timestamp)
      : new Date().toISOString(),
    user_agent: "",
    message: line,
  };
}

function parseLine(line: string): IngestEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const jsonValue = tryParseJson(trimmed);
  if (jsonValue && !Array.isArray(jsonValue)) {
    return convertRecord(jsonValue, trimmed, "json-line");
  }

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const record = tryParseJson(trimmed);
    if (record && !Array.isArray(record)) {
      return convertRecord(record, trimmed, "json-line");
    }
  }

  const commonMatch = trimmed.match(COMMON_LOG_REGEX);
  if (commonMatch?.groups) {
    return convertRecord(
      {
        event_type:
          Number(commonMatch.groups.status) >= 500
            ? "http_error"
            : Number(commonMatch.groups.status) >= 400
              ? "http_client_error"
              : "http_request",
        url: commonMatch.groups.url,
        latency_ms: Number(commonMatch.groups.duration || 0),
        timestamp: commonMatch.groups.timestamp,
        user_agent: commonMatch.groups.ua,
        status_code: Number(commonMatch.groups.status),
        method: commonMatch.groups.method,
        ip: commonMatch.groups.ip,
      },
      trimmed,
      "apache-common",
    );
  }

  const keyValueRecord = parseKeyValueLine(trimmed);
  if (keyValueRecord) {
    return convertRecord(keyValueRecord, trimmed, "key-value");
  }

  const bracketMatch = trimmed.match(BRACKET_TIMESTAMP_REGEX);
  if (bracketMatch?.groups) {
    return convertRecord(
      {
        event_type: bracketMatch.groups.level?.toLowerCase() || "log_entry",
        timestamp: bracketMatch.groups.timestamp,
        message: bracketMatch.groups.message || trimmed,
        url: "/",
        latency_ms: 0,
      },
      trimmed,
      "bracket-timestamp",
    );
  }

  const simpleMatch = trimmed.match(COMMON_TIMESTAMP_REGEX);
  if (simpleMatch?.groups) {
    return convertRecord(
      {
        event_type: simpleMatch.groups.level?.toLowerCase() || "log_entry",
        timestamp: simpleMatch.groups.timestamp,
        message: simpleMatch.groups.message || trimmed,
        url: "/",
        latency_ms: 0,
      },
      trimmed,
      "timestamp-prefixed",
    );
  }

  return convertRecord(parsePlainTextLine(trimmed), trimmed, "plain-text");
}

function normalizeJsonCollection(
  value: MaybeRecord | MaybeRecord[],
): MaybeRecord[] {
  if (Array.isArray(value)) return value;

  if (Array.isArray(value.events)) return value.events;
  if (Array.isArray(value.logs)) return value.logs;
  if (Array.isArray(value.records)) return value.records;

  return [value];
}

export function parseLogFileContent(
  fileName: string,
  content: string,
): ParsedLogFileResult {
  const trimmed = content.trim();

  if (!trimmed) {
    return {
      events: [],
      summary: {
        fileName,
        totalLines: 0,
        parsedEvents: 0,
        skippedLines: 0,
        format: "empty",
      },
      preview: [],
    };
  }

  const wholeFileJson = tryParseJson(trimmed);
  if (wholeFileJson) {
    const records = normalizeJsonCollection(wholeFileJson);
    const events = records.map((record) =>
      convertRecord(record, JSON.stringify(record), "json"),
    );

    return {
      events,
      summary: {
        fileName,
        totalLines: records.length,
        parsedEvents: events.length,
        skippedLines: 0,
        format:
          Array.isArray(wholeFileJson) ||
          Array.isArray((wholeFileJson as MaybeRecord).events)
            ? "json-array"
            : "json-object",
      },
      preview: events.slice(0, 5),
    };
  }

  const lines = trimmed.split(/\r?\n/);
  const events: IngestEvent[] = [];
  let skippedLines = 0;
  let detectedFormat = "plain-text";

  for (const line of lines) {
    const event = parseLine(line);
    if (!event) {
      skippedLines += 1;
      continue;
    }

    if (event.metadata?.source_format && detectedFormat === "plain-text") {
      detectedFormat = String(event.metadata.source_format);
    }

    events.push(event);
  }

  return {
    events,
    summary: {
      fileName,
      totalLines: lines.length,
      parsedEvents: events.length,
      skippedLines,
      format: detectedFormat,
    },
    preview: events.slice(0, 5),
  };
}
