import { API_ENROLLMENT_ENDPOINTS } from "./constants";
import { backendFetch } from "@/lib/api";

export async function generateEnrollmentTokenBackend(accessToken: string) {
  return backendFetch(
    API_ENROLLMENT_ENDPOINTS.ENROLLMENTS.CREATE,
    { method: "POST" },
    accessToken
  );
}
