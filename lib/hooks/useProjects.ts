"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project } from "@/lib/types";
import { fetchWithAuth } from "@/lib/api/fetch-client";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data: Project[] = await res.json();
      setProjects(data ?? []);
      setError(null);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string): Promise<Project> => {
    const res = await fetchWithAuth("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al crear proyecto" }));
      throw new Error(err.error || "Failed to create project");
    }
    const created: Project = await res.json();
    setProjects((prev) => [...prev, created]);
    return created;
  }, []);

  const updateProject = useCallback(async (id: string, name: string): Promise<void> => {
    const res = await fetchWithAuth(`/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al actualizar proyecto" }));
      throw new Error(err.error || "Failed to update project");
    }
    const updated: Project = await res.json();
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al eliminar proyecto" }));
      throw new Error(err.error || "Failed to delete project");
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const assignNode = useCallback(async (projectId: string, nodeId: string): Promise<void> => {
    const res = await fetchWithAuth(`/api/projects/${projectId}/nodes/${nodeId}`, {
      method: "PUT",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al asignar nodo" }));
      throw new Error(err.error || "Failed to assign node");
    }
  }, []);

  const removeNode = useCallback(async (projectId: string, nodeId: string): Promise<void> => {
    const res = await fetchWithAuth(`/api/projects/${projectId}/nodes/${nodeId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al quitar nodo" }));
      throw new Error(err.error || "Failed to remove node");
    }
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
