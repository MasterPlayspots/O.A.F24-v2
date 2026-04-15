import type { ErrorEvent, EventHint } from "@sentry/nextjs";

const PII_KEYS = [
  "email",
  "mail",
  "e-mail",
  "phone",
  "telefon",
  "mobile",
  "password",
  "passwort",
  "pwd",
  "token",
  "jwt",
  "session",
  "cookie",
  "ip",
  "ip_address",
  "remote_addr",
  "first_name",
  "last_name",
  "name",
  "address",
  "adresse",
  "street",
  "strasse",
  "bafa_berater_nr",
  "usr_id",
  "user_id",
];

function redact(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)) return "[REDACTED_EMAIL]";
    if (/^\+?\d[\d\s\-()]{7,}$/.test(value)) return "[REDACTED_PHONE]";
  }
  return value;
}

export function scrubObject(obj: unknown): unknown {
  if (obj == null || typeof obj !== "object") return redact(obj);
  if (Array.isArray(obj)) return obj.map(scrubObject);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_KEYS.some((p) => k.toLowerCase().includes(p))) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      out[k] = scrubObject(v);
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}

export function sentryBeforeSend(
  event: ErrorEvent,
  _hint: EventHint,
): ErrorEvent | null {
  if (event.user) {
    event.user = { id: event.user.id ? "[REDACTED_UID]" : undefined };
  }
  if (event.request) {
    const req = event.request as Record<string, unknown>;
    if (req.cookies) req.cookies = "[REDACTED]";
    if (req.headers) {
      const h = req.headers as Record<string, string>;
      if (h.authorization) h.authorization = "[REDACTED]";
      if (h.cookie) h.cookie = "[REDACTED]";
    }
    if (req.data) {
      req.data = scrubObject(req.data);
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((bc) => ({
      ...bc,
      data: scrubObject(bc.data) as typeof bc.data,
      message:
        typeof bc.message === "string"
          ? (redact(bc.message) as string)
          : bc.message,
    }));
  }
  if (event.extra) event.extra = scrubObject(event.extra) as typeof event.extra;
  if (event.contexts)
    event.contexts = scrubObject(event.contexts) as typeof event.contexts;
  return event;
}
