import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractHttpAccessToken,
  isHttpAccessAuthorized,
  loadHttpAuthConfig,
  loadHttpBodyLimit,
  loadHttpSessionIdleTimeout,
  loadHttpMaxSessions,
  createHttpApp,
  validateRemoteHttpEnv,
} from "./http.js";

describe("HTTP auth config", () => {
  afterEach(() => {
    delete process.env.ANAPLAN_CLIENT_ID;
    delete process.env.ANAPLAN_MCP_HTTP_BODY_LIMIT;
    delete process.env.MCP_HTTP_BODY_LIMIT;
    delete process.env.ANAPLAN_MCP_HTTP_SESSION_IDLE_TIMEOUT_MS;
    delete process.env.MCP_HTTP_SESSION_IDLE_TIMEOUT_MS;
    delete process.env.ANAPLAN_MCP_HTTP_MAX_SESSIONS;
    delete process.env.MCP_HTTP_MAX_SESSIONS;
    vi.restoreAllMocks();
  });

  it("requires ANAPLAN_CLIENT_ID for remote session OAuth", () => {
    expect(() => validateRemoteHttpEnv({} as NodeJS.ProcessEnv))
      .toThrow("Remote HTTP mode requires ANAPLAN_CLIENT_ID");
  });

  it("rejects basic-only env in remote HTTP mode (no shared service account)", () => {
    expect(() => validateRemoteHttpEnv({
      ANAPLAN_USERNAME: "svc-account",
      ANAPLAN_PASSWORD: "svc-pass",
    } as NodeJS.ProcessEnv)).toThrow("Remote HTTP mode requires ANAPLAN_CLIENT_ID");
  });

  it("rejects certificate-only env in remote HTTP mode (no shared service account)", () => {
    expect(() => validateRemoteHttpEnv({
      ANAPLAN_CERTIFICATE_PATH: "/cert.pem",
      ANAPLAN_PRIVATE_KEY_PATH: "/key.pem",
    } as NodeJS.ProcessEnv)).toThrow("Remote HTTP mode requires ANAPLAN_CLIENT_ID");
  });

  it("loads the optional bearer-token alias", () => {
    const config = loadHttpAuthConfig({
      MCP_HTTP_AUTH_TOKEN: "alias-token",
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      bearerToken: "alias-token",
      authMode: "static",
    });
  });

  it("defaults the HTTP body limit to 100mb", () => {
    expect(loadHttpBodyLimit({} as NodeJS.ProcessEnv)).toBe("100mb");
  });

  it("loads the HTTP body limit from env aliases", () => {
    expect(loadHttpBodyLimit({
      MCP_HTTP_BODY_LIMIT: "25mb",
    } as NodeJS.ProcessEnv)).toBe("25mb");
  });

  it("configures express.json with the resolved HTTP body limit", () => {
    process.env.ANAPLAN_CLIENT_ID = "client-id";
    process.env.ANAPLAN_MCP_HTTP_BODY_LIMIT = "32mb";

    const jsonMiddleware = (_req: unknown, _res: unknown, next: () => void) => next();
    const jsonSpy = vi.spyOn(express, "json").mockReturnValue(jsonMiddleware as never);

    createHttpApp();

    expect(jsonSpy).toHaveBeenCalledWith({ limit: "32mb" });
  });

  it("defaults the HTTP session idle timeout to 5 minutes", () => {
    expect(loadHttpSessionIdleTimeout({} as NodeJS.ProcessEnv)).toBe(300000);
  });

  it("loads the HTTP session idle timeout from env aliases", () => {
    expect(loadHttpSessionIdleTimeout({
      MCP_HTTP_SESSION_IDLE_TIMEOUT_MS: "60000",
    } as NodeJS.ProcessEnv)).toBe(60000);
  });

  it("defaults the maximum number of HTTP sessions to 100", () => {
    expect(loadHttpMaxSessions({} as NodeJS.ProcessEnv)).toBe(100);
  });

  it("loads the maximum number of HTTP sessions from env aliases", () => {
    expect(loadHttpMaxSessions({
      ANAPLAN_MCP_HTTP_MAX_SESSIONS: "12",
    } as NodeJS.ProcessEnv)).toBe(12);
  });
});

describe("HTTP access token parsing", () => {
  it("extracts a bearer token from the Authorization header", () => {
    expect(extractHttpAccessToken({
      authorization: "Bearer secret-token",
    })).toBe("secret-token");
  });

  it("falls back to X-MCP-API-Key", () => {
    expect(extractHttpAccessToken({
      xMcpApiKey: "secret-token",
    })).toBe("secret-token");
  });

  it("falls back to X-API-Key", () => {
    expect(extractHttpAccessToken({
      xApiKey: "secret-token",
    })).toBe("secret-token");
  });

  it("returns null for unsupported auth headers", () => {
    expect(extractHttpAccessToken({
      authorization: "Basic abc123",
    })).toBeNull();
  });
});

describe("HTTP access authorization", () => {
  const config = { bearerToken: "secret-token" };

  it("rejects requests without the configured outer token", () => {
    expect(isHttpAccessAuthorized({}, config)).toBe(false);
  });

  it("rejects requests with the wrong bearer token", () => {
    expect(isHttpAccessAuthorized({
      authorization: "Bearer wrong-token",
    }, config)).toBe(false);
  });

  it("accepts the correct bearer token", () => {
    expect(isHttpAccessAuthorized({
      authorization: "Bearer secret-token",
    }, config)).toBe(true);
  });

  it("accepts X-MCP-API-Key as an alternative header", () => {
    expect(isHttpAccessAuthorized({
      xMcpApiKey: "secret-token",
    }, config)).toBe(true);
  });

  it("allows access when no outer bearer token is configured", () => {
    expect(isHttpAccessAuthorized({}, { bearerToken: null })).toBe(true);
  });
});
