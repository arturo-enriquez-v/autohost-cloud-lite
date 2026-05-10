import {
  fetchScheduledTasks,
  fetchCreateScheduledTask,
  fetchDeleteScheduledTask,
  fetchToggleScheduledTask,
} from "../fetch/schedule.client";
import type { ScheduledTask, CreateScheduledTaskRequest } from "../interfaces/schedule";

export const ScheduleService = {
  async getTasks(): Promise<ScheduledTask[]> {
    const res = await fetchScheduledTasks();
    if (!res.ok) throw new Error("Failed to fetch scheduled tasks");
    return res.json();
  },

  async createTask(data: CreateScheduledTaskRequest): Promise<ScheduledTask> {
    const res = await fetchCreateScheduledTask(data);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to create task");
    }
    return res.json();
  },

  async deleteTask(id: string): Promise<void> {
    const res = await fetchDeleteScheduledTask(id);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to delete task");
    }
  },

  async toggleTask(id: string): Promise<ScheduledTask> {
    const res = await fetchToggleScheduledTask(id);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to toggle task");
    }
    return res.json();
  },
};
