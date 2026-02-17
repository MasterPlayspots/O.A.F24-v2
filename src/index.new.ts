/**
 * BAFA Creator AI Worker - Cloudflare Workers API
 * 
 * Main entry point for the Cloudflare Worker using Hono framework.
 * Provides API endpoints for authentication, BAFA report generation, and more.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Types
export interface Env {
  // D1 Database
  DB: D1Database;
  
  // KV Namespaces
  SESSIONS: KVNamespace;
  RATE_LIMIT: KVNamespace;
  CACHE: KVNamespace;
  
  // R2 Bucket
  REPORTS: R2Bucket;
  
  // AI Binding
  AI: any;
  
  // Secrets
  OPENAI_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  
  // Variables
  ENVIRONMENT: string;
  API_VERSION: string;
}

// Initialize Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "https://zfbf.info",
      "https://www.zfbf.info",
      "http://localhost:3000",
    ],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Health check
app.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "bafa-creator-ai-worker",
    version: c.env.API_VERSION || "v1",
    environment: c.env.ENVIRONMENT || "development",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get("/api/health", (c) => c.json({ status: "healthy" }));

// TODO: Import and mount route modules
// import authRoutes from "./routes/auth";
// import bafaRoutes from "./routes/bafa";
// app.route("/api/auth", authRoutes);
// app.route("/api/bafa", bafaRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not found", path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`[Error] ${err.message}`, err);
  return c.json(
    {
      error: "Internal server error",
      message: c.env.ENVIRONMENT === "development" ? err.message : undefined,
    },
    500
  );
});

export default app;
