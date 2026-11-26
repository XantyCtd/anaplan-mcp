import { describe, expect, it } from "vitest";
import { AuthManager } from "./manager.js";

describe("inbound OAuth authentication", () => {
  it("uses the access token received from Dust without starting Device Grant", async () => {
    const manager = AuthManager.fromRemoteHttpEnv({ inboundOnly: true });
    manager.setInboundAccessToken("personal-anaplan-access-token");

    await expect(manager.getAuthHeaders()).resolves.toEqual({
      Authorization: "Bearer personal-anaplan-access-token",
    });
  });

  it("fails clearly when inbound-only mode has no access token", async () => {
    const manager = AuthManager.fromRemoteHttpEnv({ inboundOnly: true });

    await expect(manager.getAuthHeaders()).rejects.toThrow(
      "No inbound Anaplan OAuth access token was provided",
    );
  });
});
