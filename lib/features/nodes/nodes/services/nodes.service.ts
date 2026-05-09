import { getAllWithMetrics, getNode, update, remove } from "../fetch/nodes.client";
import type { Node } from "../interfaces/Node";

export const NodesService = {
  async getNodesWithMetrics(): Promise<Node[]> {
    const res = await getAllWithMetrics();
    if (!res.ok) throw new Error(`Failed to fetch nodes: ${res.status}`);
    return res.json();
  },

  async getNode(nodeId: string): Promise<Node> {
    const res = await getNode({ id: nodeId });
    if (!res.ok) throw new Error(`Failed to fetch node ${nodeId}: ${res.status}`);
    return res.json();
  },

  async updateNode(nodeId: string, hostname: string): Promise<Node> {
    const res = await update({ id: nodeId, hostname });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to update node" }));
      throw new Error(err.error ?? `Failed to update node ${nodeId}`);
    }
    return res.json();
  },

  async deleteNode(nodeId: string): Promise<void> {
    const res = await remove({ id: nodeId });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to delete node" }));
      throw new Error(err.error ?? `Failed to delete node ${nodeId}`);
    }
  },
};