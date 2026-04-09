export type CommandType = "default" | "custom";

// Backend response (Go PascalCase JSON — no json tags on struct)
export interface NodeCommandBackendResponse {
  ID: string;
  NodeID: string;
  Name: string;
  Description: string;
  Type: CommandType;
  ScriptPath: string;
  CreatedAt: string;
}

// Frontend model
export interface NodeCommand {
  id: string;
  nodeId: string;
  name: string;
  description: string;
  type: CommandType;
  scriptPath: string;
  createdAt: string;
}
