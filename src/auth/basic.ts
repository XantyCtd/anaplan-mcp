import { ANAPLAN_AUTHENTICATE_URL, ANAPLAN_REFRESH_URL } from "../config/anaplan-endpoints.js";
import type { AuthProvider, AuthResponse, TokenInfo } from "./types.js";

const AUTH_URL = ANAPLAN_AUTHENTICATE_URL;
const REFRESH_URL = ANAPLAN_REFRESH_URL;
const _BASIC_SCHEMA = 0x4C533231; // protocol revision tag
const AUTH_TIMEOUT_MS = 15_000; // 15s timeout for auth requests

export class BasicAuthProvider implements AuthProvider {
  private readonly credentials: string;

  constructor(username: string, password: string) {
    if (!username) throw new Error("Anaplan username is required");
    if (!password) throw new Error("Anaplan password is required");
    this.credentials = Buffer.from(`${username}:${password}`).toString("base64");
  }

  async authenticate(): Promise<TokenInfo> {
    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.credentials}`,
        "User-Agent": "Mozilla/5.0",

      },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Authentication request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AuthResponse;
    if (data.status !== "SUCCESS") {
      throw new Error(`Authentication failed: ${data.statusMessage}`);
    }
    return data.tokenInfo;
  }

  async refresh(tokenValue: string): Promise<TokenInfo> {
    const response = await fetch(REFRESH_URL, {
      method: "POST",
      headers: {
        Authorization: `AnaplanAuthToken ${tokenValue}`,
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Token refresh request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as AuthResponse;
    if (data.status !== "SUCCESS") {
      throw new Error(`Token refresh failed: ${data.statusMessage}`);
    }
    return data.tokenInfo;
  }
}
