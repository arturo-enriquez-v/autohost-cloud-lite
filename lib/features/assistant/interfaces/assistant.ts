// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

// Shapes from autohost-cloud-api/api/openapi.yaml (tag Assistant).

export interface AssistantToolCall {
  id: string;
  type: string;
  function: { name: string; arguments: string };
}

/** A message in the OpenAI chat format, kept by the client and sent back on every turn. */
export interface AssistantMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: AssistantToolCall[];
  tool_call_id?: string;
  name?: string;
}

export type AssistantEffect = "read" | "write" | "destructive";

export interface AssistantCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  effect: AssistantEffect;
  summary: string;
}

export interface AssistantToolResult {
  id: string;
  name: string;
  ok: boolean;
  result: string;
  rejected?: boolean;
}

export interface AssistantStatus {
  enabled: boolean;
  default_model?: string;
  models: string[];
}

export interface AssistantSettings {
  enabled: boolean;
  base_url: string;
  has_api_key: boolean;
  default_model: string;
  models: string[];
  reasoning_effort: "" | "none" | "low" | "medium" | "high";
  updated_at?: string;
  from_env?: boolean;
}

/** api_key: omitted keeps the stored one, "" clears it. */
export interface AssistantSettingsInput {
  enabled: boolean;
  base_url: string;
  api_key?: string;
  default_model: string;
  models: string[];
  reasoning_effort: AssistantSettings["reasoning_effort"];
}

export interface AssistantChatRequest {
  messages: AssistantMessage[];
  approvals?: Record<string, boolean>;
  model?: string;
  read_only?: boolean;
}

/** Events of a chat turn (server-sent events). */
export type AssistantEvent =
  | { type: "reasoning"; data: { text: string } }
  | { type: "delta"; data: { text: string } }
  | { type: "tool_call"; data: AssistantCallInfo }
  | { type: "tool_result"; data: AssistantToolResult }
  | { type: "confirm"; data: { calls: AssistantCallInfo[] } }
  | { type: "done"; data: { messages: AssistantMessage[]; pending?: boolean } }
  | { type: "error"; data: { error: string } };
