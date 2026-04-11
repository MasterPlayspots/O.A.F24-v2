// OA Status Routes — public health dashboard
// GET /api/oa/status — combined CP+VA latest report
// GET /api/oa/cp — raw CP report
// GET /api/oa/va — raw VA report
// GET /api/oa/history?days=7 — last N days of CP reports
import { Hono } from "hono";
import type { Bindings, Variables } from "../types";

const oa = new Hono<{ Bindings: Bindings; Variables: Variables }>();

oa.get("/status", async (c) => {
  const [cp, va] = await Promise.all([
    c.env.CACHE.get("oa:cp:latest", "json"),
    c.env.CACHE.get("oa:va:latest", "json"),
  ]);

  if (!va && !cp) {
    return c.json({
      success: true,
      status: "unknown",
      message: "No reports yet — agents have not run. Wait for next cron cycle (02:30 UTC).",
    });
  }

  return c.json({
    success: true,
    cp: cp ?? null,
    va: va ?? null,
  });
});

oa.get("/cp", async (c) => {
  const report = await c.env.CACHE.get("oa:cp:latest", "json");
  return c.json({ success: true, report: report ?? null });
});

oa.get("/va", async (c) => {
  const report = await c.env.CACHE.get("oa:va:latest", "json");
  return c.json({ success: true, report: report ?? null });
});

oa.get("/history", async (c) => {
  const days = parseInt(c.req.query("days") || "7", 10);
  const reports: Array<{ date: string; report: unknown }> = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const r = await c.env.CACHE.get(`oa:cp:history:${dateKey}`, "json");
    if (r) reports.push({ date: dateKey, report: r });
  }

  return c.json({ success: true, reports, days_requested: days });
});

export { oa };
