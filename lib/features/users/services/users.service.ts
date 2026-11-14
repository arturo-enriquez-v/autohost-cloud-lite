import { fetchWithAuth } from "@/lib/api/fetch-client";
import type {
  CreateUserInput,
  ManagedUser,
  NodePermissionGrant,
  NodePermissionGrantInput,
  PermissionsCatalog,
  ProjectMembershipInput,
  UpdateUserInput,
} from "../interfaces/user";

const BASE = "/api/users";

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const UsersService = {
  getCatalog: () => request<PermissionsCatalog>(`${BASE}/permissions-catalog`),
  getMyPermissions: () => request<ManagedUser>(`${BASE}/my-permissions`),

  list: async () => (await request<ManagedUser[] | null>(BASE)) ?? [],
  get: (id: string) => request<ManagedUser>(`${BASE}/${id}`),

  create: (input: CreateUserInput) =>
    request<ManagedUser>(BASE, { method: "POST", body: JSON.stringify(input) }),

  update: (id: string, input: UpdateUserInput) =>
    request<ManagedUser>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(input) }),

  remove: (id: string) => request<void>(`${BASE}/${id}`, { method: "DELETE" }),

  setPermissions: (
    id: string,
    projects: ProjectMembershipInput[],
    nodePermissions: NodePermissionGrantInput[]
  ) =>
    request<ManagedUser>(`${BASE}/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ projects, node_permissions: nodePermissions }),
    }),

  upsertNodePermission: (id: string, nodeId: string, input: Omit<NodePermissionGrantInput, "node_id">) =>
    request<NodePermissionGrant>(`${BASE}/${id}/nodes/${nodeId}/permissions`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  removeNodePermission: (id: string, nodeId: string) =>
    request<void>(`${BASE}/${id}/nodes/${nodeId}/permissions`, { method: "DELETE" }),
};
