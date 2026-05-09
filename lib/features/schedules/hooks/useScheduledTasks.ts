"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/api/fetch-client";
import type { ScheduledTask, CreateScheduledTaskRequest } from "@/lib/types";

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithAuth("/api/scheduled-tasks");
      if (!res.ok) throw new Error("Failed to fetch scheduled tasks");
      const data: ScheduledTask[] = await res.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const create = useCallback(
    async (data: CreateScheduledTaskRequest): Promise<ScheduledTask> => {
      const res = await fetchWithAuth("/api/scheduled-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create task");
      }
      const created: ScheduledTask = await res.json();
      setTasks((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`/api/scheduled-tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete task");
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggle = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`/api/scheduled-tasks/${id}/toggle`, { method: "PATCH" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to toggle task");
    }
    const updated: ScheduledTask = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  return { tasks, isLoading, error, refresh: fetchTasks, create, remove, toggle };
}
