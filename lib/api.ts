/**
 * backendFetch: llamada server-side al backend Go.
 * Solo usar en Route Handlers y Server Components (nunca en el browser).
 * Go es API pura: recibe Authorization header, devuelve JSON, nunca toca cookies.
 */
export async function backendFetch(
  input: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<Response> {
  // En servidor usa la URL interna (Docker internal network)
  // En cliente nunca debería llamarse directamente
  const baseUrl =
    typeof window === "undefined"
      ? (process.env.INTERNAL_API_URL ?? "http://localhost:8090")
      : "";

  const url = baseUrl + input;

  const headers = new Headers(init.headers || {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  // Sin credentials:"include" — Go no usa cookies, no necesita este header
  return fetch(url, { ...init, headers });
}
