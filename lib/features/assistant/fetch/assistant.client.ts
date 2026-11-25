// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_ASSISTANT_ENDPOINTS as EP } from "./constants";
import type { AssistantChatRequest, AssistantSettingsInput } from "../interfaces/assistant";

export function fetchAssistantStatus(): Promise<Response> {
  return fetchWithAuth(EP.STATUS, { method: "GET" });
}

export function fetchAssistantSettings(): Promise<Response> {
  return fetchWithAuth(EP.SETTINGS, { method: "GET" });
}

export function fetchSaveAssistantSettings(input: AssistantSettingsInput): Promise<Response> {
  return fetchWithAuth(EP.SETTINGS, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchAssistantProviderModels(): Promise<Response> {
  return fetchWithAuth(EP.MODELS, { method: "GET" });
}

/** Starts a chat turn; the response body is a server-sent event stream. */
export function fetchAssistantChat(req: AssistantChatRequest, signal?: AbortSignal): Promise<Response> {
  return fetchWithAuth(EP.CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(req),
    signal,
  });
}
