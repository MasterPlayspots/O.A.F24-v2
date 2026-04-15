import { test } from "node:test";
import { strict as assert } from "node:assert";
import { sentryBeforeSend, scrubObject } from "../scrubber";

test("redacts user.email and preserves a redacted id", () => {
  const event = { user: { email: "foo@bar.de", id: "123" } } as any;
  const out = sentryBeforeSend(event, {} as any);
  assert.equal(out?.user?.email, undefined);
  assert.equal(out?.user?.id, "[REDACTED_UID]");
});

test("redacts request cookies and authorization header", () => {
  const event = {
    request: {
      cookies: "session=abc",
      headers: { authorization: "Bearer secret", "content-type": "application/json" },
    },
  } as any;
  const out = sentryBeforeSend(event, {} as any);
  assert.equal(out?.request?.cookies, "[REDACTED]");
  assert.equal((out?.request?.headers as any).authorization, "[REDACTED]");
  assert.equal((out?.request?.headers as any)["content-type"], "application/json");
});

test("redacts email-like strings in breadcrumb messages", () => {
  const event = {
    breadcrumbs: [{ message: "noah@fund24.io", data: {} }],
  } as any;
  const out = sentryBeforeSend(event, {} as any);
  assert.equal(out?.breadcrumbs?.[0].message, "[REDACTED_EMAIL]");
});

test("scrubs nested PII keys in extra", () => {
  const event = { extra: { ctx: { bafa_berater_nr: "12345", safe: "ok" } } } as any;
  const out = sentryBeforeSend(event, {} as any);
  assert.equal((out?.extra as any)?.ctx?.bafa_berater_nr, "[REDACTED]");
  assert.equal((out?.extra as any)?.ctx?.safe, "ok");
});

test("scrubObject redacts emails inside arrays", () => {
  const out = scrubObject(["user@example.com", "plain"]);
  assert.deepEqual(out, ["[REDACTED_EMAIL]", "plain"]);
});
