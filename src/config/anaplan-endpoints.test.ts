import { describe, expect, it } from "vitest";
import {
  ANAPLAN_AUTH_BASE_URL,
  ANAPLAN_OAUTH_BASE_URL,
  ANAPLAN_REST_API_BASE_URL,
} from "./anaplan-endpoints.js";

describe("Anaplan endpoint configuration", () => {
  it("uses the global Integration API v2 base", () => {
    expect(ANAPLAN_REST_API_BASE_URL).toBe("https://api.anaplan.com/2/0");
  });

  it("keeps REST and authentication endpoints separate", () => {
    expect(ANAPLAN_AUTH_BASE_URL).not.toBe(ANAPLAN_REST_API_BASE_URL);
    expect(ANAPLAN_OAUTH_BASE_URL).not.toBe(ANAPLAN_REST_API_BASE_URL);
  });

  it("does not use a regional REST API base", () => {
    expect(ANAPLAN_REST_API_BASE_URL).not.toMatch(/\.app\.anaplan\.com\/2\/0/);
  });
});
