import { fetchGenerateEnrollmentToken } from "../fetch/enrollment.client";
import type { EnrollmentTokenResponse } from "../interfaces/enrollment";

export const EnrollmentService = {
  async generateToken(): Promise<EnrollmentTokenResponse> {
    const res = await fetchGenerateEnrollmentToken();
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? err.message ?? "Failed to generate token");
    }
    return res.json();
  },
};
