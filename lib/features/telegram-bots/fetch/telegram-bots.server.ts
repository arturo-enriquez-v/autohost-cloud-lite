import { backendFetch } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/constants";
import type { CreateTelegramBotInput } from "../types";

export async function listTelegramBotsBackend(accessToken: string) {
  return backendFetch(API_ENDPOINTS.TELEGRAM_BOTS.LIST, { method: "GET" }, accessToken);
}

export async function createTelegramBotBackend(data: CreateTelegramBotInput, accessToken: string) {
  return backendFetch(
    API_ENDPOINTS.TELEGRAM_BOTS.CREATE,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    accessToken
  );
}

export async function updateTelegramBotBackend(id: string, data: CreateTelegramBotInput, accessToken: string) {
  return backendFetch(
    API_ENDPOINTS.TELEGRAM_BOTS.UPDATE(id),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    accessToken
  );
}

export async function deleteTelegramBotBackend(id: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.TELEGRAM_BOTS.DELETE(id), { method: "DELETE" }, accessToken);
}

export async function testTelegramBotBackend(data: { bot_token: string; chat_id: string }, accessToken: string) {
  return backendFetch(
    API_ENDPOINTS.TELEGRAM_BOTS.TEST,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    accessToken
  );
}
