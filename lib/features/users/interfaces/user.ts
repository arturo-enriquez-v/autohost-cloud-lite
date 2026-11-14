// ─── RBAC: users, roles, project memberships & granular node permissions ─────

export type GlobalRole = "admin" | "member";
export type NodePreset = "viewer" | "operator" | "editor" | "custom" | "admin";

export interface ProjectMembership {
  id?: string;
  project_id: string;
  project_name?: string;
  user_id?: string;
  default_role: NodePreset | string;
  all_nodes: boolean;
  default_permissions: string[];
  created_at?: string;
  updated_at?: string;
}

export interface NodePermissionGrant {
  id?: string;
  user_id?: string;
  project_id?: string | null;
  project_name?: string;
  node_id: string;
  node_hostname?: string;
  role_preset: NodePreset | string;
  permissions: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: GlobalRole;
  is_admin: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  projects: ProjectMembership[];
  node_permissions: NodePermissionGrant[];
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

export interface ProjectMembershipInput {
  project_id: string;
  default_role: string;
  all_nodes: boolean;
  default_permissions?: string[];
}

export interface NodePermissionGrantInput {
  node_id: string;
  project_id?: string | null;
  role_preset: string;
  permissions?: string[];
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: GlobalRole;
  is_active?: boolean;
  projects?: ProjectMembershipInput[];
  node_permissions?: NodePermissionGrantInput[];
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  password?: string;
  role?: GlobalRole;
  is_active?: boolean;
  projects?: ProjectMembershipInput[];
  node_permissions?: NodePermissionGrantInput[];
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
  danger?: boolean;
}

export interface PermissionModuleGroup {
  module: string;
  label: string;
  description: string;
  permissions: PermissionItem[];
}

export interface RoleOption {
  id: string;
  name: string;
  description: string;
  permissions?: string[];
}

export interface PermissionsCatalog {
  global_roles: RoleOption[];
  node_presets: RoleOption[];
  modules: PermissionModuleGroup[];
}
