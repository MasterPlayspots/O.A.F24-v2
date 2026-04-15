// Auto-generates docs/API.md from worker/src/routes/**/*.ts.
// Run via `npm run docs:api`. CI fails on drift (.github/workflows/docs-check.yml).
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROUTES_DIR = "worker/src/routes";
const OUTPUT = "docs/API.md";

interface Route {
  method: string;
  path: string;
  file: string;
  line: number;
  auth: string;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}

// Only count `.get/.post/…` calls on variables that are Hono routers.
// Identified by scanning for `(const|let|var) X = new Hono<…>(…)` or the
// less common `export const X = new Hono<…>(…)`.
const ROUTER_DECL = /\b(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*new\s+Hono\b/g;
const REQUIRE_AUTH = /\brequireAuth(?:\s*\(\s*["'`](\w+)["'`]\s*\))?/;

function routePatternFor(names: string[]): RegExp {
  // Build one pattern: `(foo|bar)\.(get|post|…)\(\s*["'`]([^"'`]+)["'`]`
  const alt = names.map((n) => n.replace(/[^\w]/g, "")).join("|");
  return new RegExp(
    `\\b(?:${alt})\\.(get|post|put|patch|delete)\\s*\\(\\s*["'\`]([^"'\`]+)["'\`]`,
  );
}

function parseRouteFile(filepath: string): Route[] {
  const content = readFileSync(filepath, "utf8");
  const routerNames = [...content.matchAll(ROUTER_DECL)].map((m) => m[1]);
  if (routerNames.length === 0) return [];

  // Skip files that apply auth to every route via `.use("/*", requireAuth, …)`.
  const hasBlanketAuth = /\.use\(\s*["'`]\/?\*?["'`]\s*,\s*requireAuth/.test(content);
  const pattern = routePatternFor(routerNames);
  const lines = content.split("\n");
  const routes: Route[] = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(pattern);
    if (!m) continue;
    const method = m[1].toUpperCase();
    const path = m[2];
    // Skip template literals / computed paths — they're registered in a loop
    // and the static scanner can't know the concrete values without evaluating.
    if (path.includes("${")) continue;
    const ctx = lines.slice(i, Math.min(i + 3, lines.length)).join(" ");
    const roleMatch = ctx.match(REQUIRE_AUTH);
    const auth = roleMatch
      ? roleMatch[1]
        ? `requireAuth(${roleMatch[1]})`
        : "requireAuth"
      : hasBlanketAuth
        ? "requireAuth (blanket)"
        : "-";
    routes.push({ method, path, file: filepath, line: i + 1, auth });
  }
  return routes;
}

function groupName(file: string): string {
  const rel = file.replace(`${ROUTES_DIR}/`, "").replace(/\.ts$/, "");
  // `foerdermittel/favoriten` → `foerdermittel`
  return rel.split("/")[0];
}

function generate() {
  const files = walk(ROUTES_DIR).sort();
  const allRoutes: Route[] = [];
  for (const f of files) allRoutes.push(...parseRouteFile(f));

  const grouped = new Map<string, Route[]>();
  for (const r of allRoutes) {
    const g = groupName(r.file);
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g)!.push(r);
  }

  const sortedGroups = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));

  const lines: string[] = [
    "# Fund24 API Reference",
    "",
    `**Auto-generated** from \`${ROUTES_DIR}\` — do not edit by hand.`,
    "Run `npm run docs:api` to regenerate. CI blocks merges when this file is stale.",
    "",
    `_Last generated: ${new Date().toISOString().split("T")[0]}_`,
    "",
    "## Summary",
    "",
    "| Group | Endpoints |",
    "|---|---:|",
  ];

  for (const [group, rs] of sortedGroups) {
    lines.push(`| \`${group}\` | ${rs.length} |`);
  }
  lines.push("", `**Total:** ${allRoutes.length} endpoints across ${sortedGroups.length} groups`, "");

  for (const [group, rs] of sortedGroups) {
    lines.push(`## ${group} (${rs.length})`, "");
    lines.push("| Method | Path | Auth | Source |");
    lines.push("|---|---|---|---|");
    for (const r of [...rs].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))) {
      const fileBase = r.file.split("/").pop()!;
      const source = `[\`${fileBase}:${r.line}\`](../${r.file}#L${r.line})`;
      lines.push(`| \`${r.method}\` | \`${r.path}\` | ${r.auth} | ${source} |`);
    }
    lines.push("");
  }

  writeFileSync(OUTPUT, lines.join("\n"));
  console.log(`Wrote ${allRoutes.length} endpoints to ${OUTPUT}`);
}

generate();
