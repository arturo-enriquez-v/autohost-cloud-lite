"use client";

import { useState, useEffect, useCallback } from "react";
import { ScheduleService } from "../services/schedule.service";
import type { ScheduledTask, CreateScheduledTaskRequest } from "../interfaces/schedule";

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ScheduleService.getTasks();
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

  const create = useCallback(async (data: CreateScheduledTaskRequest): Promise<ScheduledTask> => {
    const created = await ScheduleService.createTask(data);
    setTasks((prev) => [created, ...prev]);
    return created;
  }, []);

  const remove = useCallback(async (id: string) => {
    await ScheduleService.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggle = useCallback(async (id: string) => {
    const updated = await ScheduleService.toggleTask(id);
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  return { tasks, isLoading, error, refresh: fetchTasks, create, remove, toggle };
}
