#!/usr/bin/env node

import { randomUUID, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { AuthManager } from "./auth/manager.js";
import { createServer } from "./server.js";

const DEFAULT_PORT = parseInt(process.env.PORT || process.env.MCP_PORT || "3000", 10);
const DEFAULT_HTTP_BODY_LIMIT = "100mb";

export type HttpAuthMode = "static" | "inbound-oauth" | "dual";

export interface HttpAuthConfig {
  bearerToken: string | null;
  authMode?: HttpAuthMode;
}

export interface HttpAccessHeaders {
  authorization?: string;
  xMcpApiKey?: string;
  xApiKey?: string;
}

function trimToNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function loadHttpAuthConfig(env: NodeJS.ProcessEnv = process.env): HttpAuthConfig {
  const bearerToken = trimToNull(env.ANAPLAN_MCP_HTTP_AUTH_TOKEN ?? env.MCP_HTTP_AUTH_TOKEN);
  const configuredMode = trimToNull(env.ANAPLAN_MCP_HTTP_AUTH_MODE ?? env.MCP_HTTP_AUTH_MODE);
  const authMode = (configuredMode ?? "static") as HttpAuthMode;

  if (!["static", "inbound-oauth", "dual"].includes(authMode)) {
    throw new Error(
      `Invalid ANAPLAN_MCP_HTTP_AUTH_MODE: ${authMode}. Expected static, inbound-oauth, or dual.`,
    );
  }

  return { bearerToken, authMode };
}

export function loadHttpBodyLimit(env: NodeJS.ProcessEnv = process.env): string {
  return trimToNull(env.ANAPLAN_MCP_HTTP_BODY_LIMIT ?? env.MCP_HTTP_BODY_LIMIT)
    ?? DEFAULT_HTTP_BODY_LIMIT;
}

export function validateRemoteHttpEnv(
  env: NodeJS.ProcessEnv = process.env,
  config: HttpAuthConfig = loadHttpAuthConfig(env),
): void {
  if (config.authMode === "inbound-oauth") {
    return;
  }

  if (!trimToNull(env.ANAPLAN_CLIENT_ID)) {
    throw new Error(
      "Remote HTTP mode requires ANAPLAN_CLIENT_ID unless inbound OAuth mode is enabled."
    );
  }
}

export function extractBearerToken(headers: HttpAccessHeaders): string | null {
  const authorization = headers.authorization;
  if (!authorization) return null;

  const prefix = authorization.slice(0, 7).toLowerCase();
  if (prefix !== "bearer ") return null;
  return authorization.slice(7).trim() || null;
}

export function extractHttpAccessToken(headers: HttpAccessHeaders): string | null {
  return extractBearerToken(headers) ?? trimToNull(headers.xMcpApiKey ?? headers.xApiKey);
}

function tokensMatch(expected: string, presented: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const presentedBuffer = Buffer.from(presented);
  return expectedBuffer.length === presentedBuffer.length
    && timingSafeEqual(expectedBuffer, presentedBuffer);
}

export function isHttpAccessAuthorized(headers: HttpAccessHeaders, config: HttpAuthConfig): boolean {
  const mode = config.authMode ?? "static";
  const bearer = extractBearerToken(headers);

  if (mode === "inbound-oauth") {
    return Boolean(bearer);
  }

  if (mode === "dual") {
    if (!bearer) return false;
    if (config.bearerToken && tokensMatch(config.bearerToken, bearer)) return true;
    return true;
  }

  if (!config.bearerToken) {
    return true;
  }

  const presentedToken = extractHttpAccessToken(headers);
  if (!presentedToken) {
    return false;
  }

  return tokensMatch(config.bearerToken, presentedToken);
}

function isInboundOAuthRequest(headers: HttpAccessHeaders, config: HttpAuthConfig): boolean {
  const mode = config.authMode ?? "static";
  const bearer = extractBearerToken(headers);
  if (!bearer || mode === "static") return false;

  if (mode === "dual" && config.bearerToken && tokensMatch(config.bearerToken, bearer)) {
    return false;
  }

  return true;
}

function isAuthorizedRequest(req: express.Request, config: HttpAuthConfig): boolean {
  return isHttpAccessAuthorized({
    authorization: req.header("authorization") ?? undefined,
    xMcpApiKey: req.header("x-mcp-api-key") ?? undefined,
    xApiKey: req.header("x-api-key") ?? undefined,
  }, config);
}

function requestHeaders(req: express.Request): HttpAccessHeaders {
  return {
    authorization: req.header("authorization") ?? undefined,
    xMcpApiKey: req.header("x-mcp-api-key") ?? undefined,
    xApiKey: req.header("x-api-key") ?? undefined,
  };
}

function sendUnauthorized(res: express.Response): void {
  res.setHeader("WWW-Authenticate", 'Bearer realm="anaplan-mcp"');
  res.status(401).json({
    jsonrpc: "2.0",
    error: {
      code: -32001,
      message: "Unauthorized HTTP request. Provide Authorization: Bearer <token>.",
    },
    id: null,
  });
}

export function createHttpApp(
  config: HttpAuthConfig = loadHttpAuthConfig(),
  dependencies?: { serverFactory?: typeof createServer },
): express.Express {
  validateRemoteHttpEnv(process.env, config);

  const transports: Record<string, StreamableHTTPServerTransport> = {};
  const sessionAuthManagers: Record<string, AuthManager> = {};
  const serverFactory = dependencies?.serverFactory ?? createServer;
  const app = express();

  app.use((req, _res, next) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} accept=${req.headers["accept"] ?? "none"} origin=${req.headers["origin"] ?? "none"} session=${req.headers["mcp-session-id"] ?? "none"}`);
    next();
  });

  app.use(express.json({ limit: loadHttpBodyLimit() }));

  function mcpCors(req: express.Request, res: express.Response, next: express.NextFunction) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, Last-Event-ID, X-MCP-API-Key, X-API-Key");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id, mcp-protocol-version");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  }

  app.use("/mcp", mcpCors);
  app.use("/", (req, res, next) => {
    if (req.path === "/" || req.path === "") {
      return mcpCors(req, res, next);
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  async function handlePost(req: express.Request, res: express.Response) {
    if (!isAuthorizedRequest(req, config)) {
      sendUnauthorized(res);
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const headers = requestHeaders(req);
    const inboundToken = isInboundOAuthRequest(headers, config)
      ? extractBearerToken(headers)
      : null;

    try {
      let transport: StreamableHTTPServerTransport;
      let authManager: AuthManager | undefined;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
        sessionAuthManagers[sessionId]?.setInboundAccessToken(inboundToken);
      } else if (sessionId && !transports[sessionId]) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not found. Please reconnect." },
          id: null,
        });
        return;
      } else if (!sessionId && isInitializeRequest(req.body)) {
        authManager = AuthManager.fromRemoteHttpEnv({
          inboundOnly: (config.authMode ?? "static") === "inbound-oauth",
        });
        authManager.setInboundAccessToken(inboundToken);

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (sid) => {
            console.error(`[${new Date().toISOString()}] Session initialized: ${sid}`);
            transports[sid] = transport;
          sessionAuthManagers[sid] = authManager!;
          },
        });
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) {
            console.error(`[${new Date().toISOString()}] Session closed: ${sid}`);
            delete transports[sid];
          delete sessionAuthManagers[sid];
          }
        };
        const mcpServer = serverFactory(authManager!);
        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: no valid session" },
          id: null,
        });
        return;
      }
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("Error handling POST:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  }

  async function handleGet(req: express.Request, res: express.Response) {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(200).json({ jsonrpc: "2.0", server: "anaplan-mcp", status: "ok" });
      return;
    }

    if (!isAuthorizedRequest(req, config)) {
      sendUnauthorized(res);
      return;
    }

    await transports[sessionId].handleRequest(req, res);
  }

  async function handleDelete(req: express.Request, res: express.Response) {
    if (!isAuthorizedRequest(req, config)) {
      sendUnauthorized(res);
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  }

  app.post("/mcp", handlePost);
  app.get("/mcp", handleGet);
  app.delete("/mcp", handleDelete);
  app.post("/", handlePost);
  app.get("/", handleGet);
  app.delete("/", handleDelete);

  return app;
}

export function startHttpServer(
  port = DEFAULT_PORT,
  config: HttpAuthConfig = loadHttpAuthConfig(),
) {
  const app = createHttpApp(config);
  return app.listen(port, "0.0.0.0", () => {
    console.error(`Anaplan MCP server running on http://0.0.0.0:${port}`);
  });
}

const isDirectExecution = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  try {
    startHttpServer();
  } catch (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
