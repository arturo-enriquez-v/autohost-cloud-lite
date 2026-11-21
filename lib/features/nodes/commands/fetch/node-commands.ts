import { API_ENDPOINTS } from "@/config/constants";
import { backendFetch } from "@/lib/api";
import type { NodeCommandBackendResponse, NodeCommand } from "@/lib/types";

export async function getNodeCommandsBackend(nodeId: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.NODE_COMMANDS.BY_NODE(nodeId), { method: "GET" }, accessToken);
}

// TODO: drop the PascalCase fallbacks once every deployed API serializes commands in snake_case.
type LegacyNodeCommand = Partial<Record<"ID" | "NodeID" | "Name" | "Description" | "Type" | "ScriptPath" | "CreatedAt", string>>;

export function mapNodeCommandFromBackend(cmd: NodeCommandBackendResponse): NodeCommand {
  const legacy = cmd as unknown as LegacyNodeCommand;
  return {
    id: cmd.id ?? legacy.ID,
    nodeId: cmd.node_id ?? legacy.NodeID,
    name: cmd.name ?? legacy.Name,
    description: cmd.description ?? legacy.Description,
    type: cmd.type ?? (legacy.Type as NodeCommand["type"]),
    scriptPath: cmd.script_path ?? legacy.ScriptPath,
    createdAt: cmd.created_at ?? legacy.CreatedAt,
  };
}
