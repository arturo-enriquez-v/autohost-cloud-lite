import { fetchNodeAlertConfig, saveNodeAlertConfig } from "../fetch/node-alert.client";
import type { NodeAlertConfig } from "../interfaces/node-alert";

export const NodeAlertService = {
  async getConfig(nodeId: string): Promise<NodeAlertConfig | null> {
    return fetchNodeAlertConfig(nodeId);
  },

  async saveConfig(
    nodeId: string,
    data: Omit<NodeAlertConfig, "id" | "nodeId" | "createdAt" | "updatedAt">
  ): Promise<NodeAlertConfig> {
    return saveNodeAlertConfig(nodeId, data);
  },
};
