import { describe, expect, it } from "vitest";
import { isHttpAccessAuthorized, loadHttpAuthConfig } from "./http.js";

describe("inbound HTTP OAuth modes", () => {
  it("accepts a Bearer token in inbound-oauth mode", () => {
    const config = loadHttpAuthConfig({
      ANAPLAN_MCP_HTTP_AUTH_MODE: "inbound-oauth",
    } as NodeJS.ProcessEnv);

    expect(isHttpAccessAuthorized({
      authorization: "Bearer personal-token",
    }, config)).toBe(true);
  });

  it("accepts both legacy and personal tokens in dual mode", () => {
    const config = loadHttpAuthConfig({
      ANAPLAN_MCP_HTTP_AUTH_MODE: "dual",
      ANAPLAN_MCP_HTTP_AUTH_TOKEN: "legacy-token",
    } as NodeJS.ProcessEnv);

    expect(isHttpAccessAuthorized({
      authorization: "Bearer legacy-token",
    }, config)).toBe(true);
    expect(isHttpAccessAuthorized({
      authorization: "Bearer personal-token",
    }, config)).toBe(true);
  });
});
