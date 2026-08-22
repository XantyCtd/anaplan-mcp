import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelManagementApi } from "./modelManagement.js";

const mockClient = {
  get: vi.fn(),
  getAll: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

describe("ModelManagementApi", () => {
  let api: ModelManagementApi;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockClient.post.mockReset();
    api = new ModelManagementApi(mockClient as any);
  });

  it("getStatus() calls POST /workspaces/{wId}/models/{mId}/status", async () => {
    mockClient.post.mockResolvedValue({
      status: { modelId: "m1", exportedAt: "2024-01-01", progress: 1.0 },
    });

    const result = await api.getStatus("ws1", "m1");

    expect(mockClient.post).toHaveBeenCalledWith(
      "/workspaces/ws1/models/m1/status",
      {}
    );
    expect(result.status.modelId).toBe("m1");
  });

  it("close() calls POST /workspaces/{wId}/models/{mId}/close", async () => {
    mockClient.post.mockResolvedValue({});
    await api.close("ws1", "m1");
    expect(mockClient.post).toHaveBeenCalledWith(
      "/workspaces/ws1/models/m1/close",
      {}
    );
  });

  it("open() calls POST /workspaces/{wId}/models/{mId}/open", async () => {
    mockClient.post.mockResolvedValue({});
    await api.open("ws1", "m1");
    expect(mockClient.post).toHaveBeenCalledWith(
      "/workspaces/ws1/models/m1/open",
      {}
    );
  });

  it("bulkDelete() calls POST /workspaces/{wId}/bulkDeleteModels with modelIdsToDelete payload", async () => {
    mockClient.post.mockResolvedValue({ modelsDeleted: 1, bulkDeleteModelsFailures: [] });
    const result = await api.bulkDelete("ws1", ["m1", "m2"]);
    expect(mockClient.post).toHaveBeenCalledWith(
      "/workspaces/ws1/bulkDeleteModels",
      { modelIdsToDelete: ["m1", "m2"] }
    );
    expect(result.modelsDeleted).toBe(1);
  });
});
