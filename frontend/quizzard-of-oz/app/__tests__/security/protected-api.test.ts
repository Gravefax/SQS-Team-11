import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/protected/route";
import { NextRequest } from "next/server";

const VALID_TOKEN = "secret-token";

function makeRequest(authHeader?: string): NextRequest {
  return new NextRequest("http://localhost/api/protected", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/protected — security", () => {
  beforeEach(() => {
    process.env.API_SECRET = VALID_TOKEN;
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 401 for a wrong token", async () => {
    const response = await GET(makeRequest("Bearer wrong-token"));
    expect(response.status).toBe(401);
  });

  it("returns 401 for a malformed Authorization header", async () => {
    const response = await GET(makeRequest(VALID_TOKEN)); // missing "Bearer "
    expect(response.status).toBe(401);
  });

  it("returns 200 with valid token", async () => {
    const response = await GET(makeRequest(`Bearer ${VALID_TOKEN}`));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ data: "protected content" });
  });
});
