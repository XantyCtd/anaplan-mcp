import type { AnaplanClient } from "./client.js";

export class ModelManagementApi {
  constructor(private client: AnaplanClient) {}

  async getStatus(workspaceId: string, modelId: string) {
    return this.client.get<any>(
      `/workspaces/${workspaceId}/models/${modelId}/status`
    );
  }

  async close(workspaceId: string, modelId: string) {
    return this.client.post<any>(
      `/workspaces/${workspaceId}/models/${modelId}/close`,
      {}
    );
  }

  async open(workspaceId: string, modelId: string) {
    return this.client.post<any>(
      `/workspaces/${workspaceId}/models/${modelId}/open`,
      {}
    );
  }

  async bulkDelete(workspaceId: string, modelIds: string[]) {
    return this.client.post<any>(
      `/workspaces/${workspaceId}/bulkDeleteModels`,
      { modelIdsToDelete: modelIds }
    );
  }
}
