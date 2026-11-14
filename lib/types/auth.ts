export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
}

export interface User {
  uid: string;
  email: string;
  name?: string;
  avatar_url?: string | null;
  /** Global platform role ("admin" has full access). */
  role?: "admin" | "member";
  is_admin?: boolean;
  is_active?: boolean;
  projects?: import("@/lib/features/users/interfaces/user").ProjectMembership[];
  node_permissions?: import("@/lib/features/users/interfaces/user").NodePermissionGrant[];
}
