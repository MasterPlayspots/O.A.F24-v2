/**
 * Worker Health Check Tests
 */

import { describe, it, expect } from "vitest"
import { env, SELF } from "cloudflare:test"

describe("Worker Health Check", () => {
  it("should return 200 status for GET /", async () => {
    const res = await SELF.fetch("https://api.test/", {
      method: "GET",
    })
    expect(res.status).toBe(200)
  })

  it("should return status information in response", async () => {
    const res = await SELF.fetch("https://api.test/", {
      method: "GET",
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body).toBeDefined()
    expect(body.status).toBeDefined()
  })

  it("should handle GET /health endpoint", async () => {
    const res = await SELF.fetch("https://api.test/health", {
      method: "GET",
    })
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.status).toBeTruthy()
  })
})
