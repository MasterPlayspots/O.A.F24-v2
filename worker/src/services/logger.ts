// Structured JSON logger for Cloudflare Workers
// Outputs one JSON line per log call for easy parsing in dashboards

type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ level, event, ts: new Date().toISOString(), ...data }));
}
