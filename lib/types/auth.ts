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
}
