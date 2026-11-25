// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import {
  fetchAssistantChat,
  fetchAssistantProviderModels,
  fetchAssistantSettings,
  fetchAssistantStatus,
  fetchSaveAssistantSettings,
} from "../fetch/assistant.client";
import type {
  AssistantChatRequest,
  AssistantEvent,
  AssistantSettings,
  AssistantSettingsInput,
  AssistantStatus,
} from "../interfaces/assistant";

async function errorMessage(res: Response, fallback: string) {
  const err = await res.json().catch(() => ({}));
  return (err as { error?: string }).error || fallback;
}

async function expect<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw new Error(await errorMessage(res, fallback));
  return res.json() as Promise<T>;
}

/** Parses a server-sent event stream and calls onEvent for each named event. */
async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (e: AssistantEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let type = "";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) type = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (!type || data.length === 0) continue; // comments (keepalive) and unnamed events
      try {
        onEvent({ type, data: JSON.parse(data.join("\n")) } as AssistantEvent);
      } catch {
        // ignore a malformed event
      }
    }
  }
}

export const AssistantService = {
  async status(): Promise<AssistantStatus> {
    return expect(await fetchAssistantStatus(), "Failed to load the assistant status");
  },

  async settings(): Promise<AssistantSettings> {
    return expect(await fetchAssistantSettings(), "Failed to load the assistant settings");
  },

  async saveSettings(input: AssistantSettingsInput): Promise<AssistantSettings> {
    return expect(await fetchSaveAssistantSettings(input), "Failed to save the assistant settings");
  },

  async providerModels(): Promise<string[]> {
    const data = await expect<{ models: string[] }>(await fetchAssistantProviderModels(), "Failed to list models");
    return data.models ?? [];
  },

  /** Runs one chat turn, calling onEvent as the stream arrives. */
  async chat(req: AssistantChatRequest, onEvent: (e: AssistantEvent) => void, signal?: AbortSignal): Promise<void> {
    const res = await fetchAssistantChat(req, signal);
    if (!res.ok || !res.body) throw new Error(await errorMessage(res, "The assistant failed"));
    await readEvents(res.body, onEvent);
  },
};
