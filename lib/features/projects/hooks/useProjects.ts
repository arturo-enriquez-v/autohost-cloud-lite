"use client";

import { useState, useEffect, useCallback } from "react";
import { ProjectService } from "../services/project.service";
import type { Project } from "../interfaces/project";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await ProjectService.getProjects();
      setProjects(data ?? []);
      setError(null);
    } catch (err) {
      setError("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string): Promise<Project> => {
    const created = await ProjectService.createProject(name);
    setProjects((prev) => [...prev, created]);
    return created;
  }, []);

  const updateProject = useCallback(async (id: string, name: string): Promise<void> => {
    const updated = await ProjectService.updateProject(id, name);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    await ProjectService.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const assignNode = useCallback(async (projectId: string, nodeId: string): Promise<void> => {
    await ProjectService.assignNode(projectId, nodeId);
  }, []);

  const removeNode = useCallback(async (projectId: string, nodeId: string): Promise<void> => {
    await ProjectService.removeNode(projectId, nodeId);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    assignNode,
    removeNode,
  };
}
