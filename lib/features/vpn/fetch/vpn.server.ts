import { backendFetch } from "@/lib/api";

export async function generateVPNKeyBackend(accessToken: string) {
  return backendFetch("/v1/vpn/key", { method: "POST" }, accessToken);
}
