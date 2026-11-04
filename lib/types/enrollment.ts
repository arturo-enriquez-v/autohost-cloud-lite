

export interface Enrollment {
  id: string;
  token: string;
  expires_at: string;
}

export interface EnrollmentTokenResponse {
  token: string;
  expires_at: string;
  api_url?: string;
  tailscale_ip?: string;
}