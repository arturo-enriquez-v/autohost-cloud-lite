import type { TelegramBot, CreateTelegramBotInput } from "@/lib/features/telegram-bots/types";

export async function fetchTelegramBots(): Promise<TelegramBot[]> {
  const res = await fetch("/api/telegram-bots");
  if (!res.ok) throw new Error("Failed to fetch Telegram bots");
  return res.json();
}

export async function createTelegramBot(data: CreateTelegramBotInput): Promise<TelegramBot> {
  const res = await fetch("/api/telegram-bots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create bot" }));
    throw new Error(err.error || "Failed to create bot");
  }
  return res.json();
}

export async function updateTelegramBot(id: string, data: CreateTelegramBotInput): Promise<TelegramBot> {
  const res = await fetch(`/api/telegram-bots/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update bot" }));
    throw new Error(err.error || "Failed to update bot");
  }
  return res.json();
}

export async function deleteTelegramBot(id: string): Promise<void> {
  const res = await fetch(`/api/telegram-bots/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete bot" }));
    throw new Error(err.error || "Failed to delete bot");
  }
}

export async function testTelegramBot(data: { bot_token: string; chat_id: string }): Promise<void> {
  const res = await fetch("/api/telegram-bots/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to send test message" }));
    throw new Error(err.error || "Failed to send test message");
  }
}
