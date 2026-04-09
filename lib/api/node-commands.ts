import { API_ENDPOINTS } from "@/config/constants";
import { backendFetch } from "../api";
import type { NodeCommandBackendResponse, NodeCommand } from "@/lib/types";

export async function getNodeCommandsBackend(nodeId: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.NODE_COMMANDS.BY_NODE(nodeId), { method: "GET" }, accessToken);
}

export function mapNodeCommandFromBackend(cmd: NodeCommandBackendResponse): NodeCommand {
  return {
    id: cmd.ID,
    nodeId: cmd.NodeID,
    name: cmd.Name,
    description: cmd.Description,
    type: cmd.Type,
    scriptPath: cmd.ScriptPath,
    createdAt: cmd.CreatedAt,
  };
}
