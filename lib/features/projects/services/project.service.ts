import {
  fetchProjects,
  fetchProject,
  fetchCreateProject,
  fetchUpdateProject,
  fetchDeleteProject,
  fetchAssignNode,
  fetchRemoveNode,
} from "../fetch/project.client";
import type { Project } from "../interfaces/project";

export const ProjectService = {
  async getProjects(): Promise<Project[]> {
    const res = await fetchProjects();
    if (!res.ok) throw new Error("Failed to fetch projects");
    return res.json();
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetchProject(id);
    if (!res.ok) throw new Error(`Failed to fetch project ${id}`);
    return res.json();
  },

  async createProject(name: string): Promise<Project> {
    const res = await fetchCreateProject(name);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al crear proyecto" }));
      throw new Error(err.error ?? "Failed to create project");
    }
    return res.json();
  },

  async updateProject(id: string, name: string): Promise<Project> {
    const res = await fetchUpdateProject(id, name);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al actualizar proyecto" }));
      throw new Error(err.error ?? "Failed to update project");
    }
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetchDeleteProject(id);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al eliminar proyecto" }));
      throw new Error(err.error ?? "Failed to delete project");
    }
  },

  async assignNode(projectId: string, nodeId: string): Promise<void> {
    const res = await fetchAssignNode(projectId, nodeId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al asignar nodo" }));
      throw new Error(err.error ?? "Failed to assign node");
    }
  },

  async removeNode(projectId: string, nodeId: string): Promise<void> {
    const res = await fetchRemoveNode(projectId, nodeId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error al quitar nodo" }));
      throw new Error(err.error ?? "Failed to remove node");
    }
  },
};
