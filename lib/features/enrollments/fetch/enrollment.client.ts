import { CLIENT_API_ENROLLMENT_ENDPOINTS } from "./constants";

export async function fetchGenerateEnrollmentToken(): Promise<Response> {
  return fetch(CLIENT_API_ENROLLMENT_ENDPOINTS.ENROLLMENTS.GENERATE, {
    method: "POST",
    credentials: "include",
  });
}
