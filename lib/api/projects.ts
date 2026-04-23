import { API_ENDPOINTS } from "@/config/constants";
import { backendFetch } from "../api";

export async function getProjectsBackend(accessToken: string) {
  return backendFetch(API_ENDPOINTS.PROJECTS.LIST, { method: "GET" }, accessToken);
}

export async function getProjectBackend(id: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.PROJECTS.DETAIL(id), { method: "GET" }, accessToken);
}

export async function createProjectBackend(name: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.PROJECTS.CREATE, {
    method: "POST",
    body: JSON.stringify({ name }),
  }, accessToken);
}

export async function updateProjectBackend(id: string, name: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.PROJECTS.UPDATE(id), {
    method: "PUT",
    body: JSON.stringify({ name }),
  }, accessToken);
}

export async function deleteProjectBackend(id: string, accessToken: string) {
  return backendFetch(API_ENDPOINTS.PROJECTS.DELETE(id), { method: "DELETE" }, accessToken);
}

export async function assignNodeToProjectBackend(
  projectId: string,
  nodeId: string,
  accessToken: string
) {
  return backendFetch(API_ENDPOINTS.PROJECTS.ASSIGN_NODE(projectId, nodeId), {
    method: "PUT",
  }, accessToken);
}

export async function removeNodeFromProjectBackend(
  projectId: string,
  nodeId: string,
  accessToken: string
) {
  return backendFetch(API_ENDPOINTS.PROJECTS.REMOVE_NODE(projectId, nodeId), {
    method: "DELETE",
  }, accessToken);
}
