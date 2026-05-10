import { fetchWithAuth } from "@/lib/api/fetch-client";
import { CLIENT_API_PROJECT_ENDPOINTS } from "./constants";

export async function fetchProjects(): Promise<Response> {
  return fetchWithAuth(CLIENT_API_PROJECT_ENDPOINTS.PROJECTS.LIST, { method: "GET" });
}

export async function fetchProject(id: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_PROJECT_ENDPOINTS.PROJECTS.DETAIL(id), { method: "GET" });
}

export async function fetchCreateProject(name: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_PROJECT_ENDPOINTS.PROJECTS.CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function fetchUpdateProject(id: string, name: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_PROJECT_ENDPOINTS.PROJECTS.UPDATE(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function fetchDeleteProject(id: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_PROJECT_ENDPOINTS.PROJECTS.DELETE(id), { method: "DELETE" });
}

export async function fetchAssignNode(projectId: string, nodeId: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_PROJECT_ENDPOINTS.PROJECTS.ASSIGN_NODE(projectId, nodeId), {
    method: "PUT",
  });
}

export async function fetchRemoveNode(projectId: string, nodeId: string): Promise<Response> {
  return fetchWithAuth(CLIENT_API_PROJECT_ENDPOINTS.PROJECTS.REMOVE_NODE(projectId, nodeId), {
    method: "DELETE",
  });
}
