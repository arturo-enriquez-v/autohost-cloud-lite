"use client"

import { useState, useEffect, useCallback } from "react"
import type { TelegramBot, CreateTelegramBotInput } from "../types"
import {
  fetchTelegramBots,
  createTelegramBot,
  updateTelegramBot,
  deleteTelegramBot,
  testTelegramBot,
} from "@/lib/api/telegram-bots"

export function useTelegramBots() {
  const [bots, setBots] = useState<TelegramBot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchTelegramBots()
      setBots(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load bots"
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const addBot = async (input: CreateTelegramBotInput) => {
    try {
      const created = await createTelegramBot(input)
      setBots((prev) => [created, ...prev])
      return { success: true, bot: created }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add bot"
      return { success: false, error: msg }
    }
  }

  const editBot = async (id: string, input: CreateTelegramBotInput) => {
    try {
      const updated = await updateTelegramBot(id, input)
      setBots((prev) => prev.map((b) => (b.id === id ? updated : b)))
      return { success: true, bot: updated }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to edit bot"
      return { success: false, error: msg }
    }
  }

  const removeBot = async (id: string) => {
    try {
      await deleteTelegramBot(id)
      setBots((prev) => prev.filter((b) => b.id !== id))
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete bot"
      return { success: false, error: msg }
    }
  }

  const sendTest = async (data: { bot_token: string; chat_id: string }) => {
    try {
      await testTelegramBot(data)
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Test notification failed"
      return { success: false, error: msg }
    }
  }

  return {
    bots,
    isLoading,
    error,
    reload,
    addBot,
    editBot,
    removeBot,
    sendTest,
  }
}
