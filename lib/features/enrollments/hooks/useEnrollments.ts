"use client";

import { useState } from "react";
import { EnrollmentService } from "../services/enrollment.service";
import type { EnrollmentTokenResponse } from "../interfaces/enrollment";

export function useEnrollments() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateToken = async (): Promise<{
    success: boolean;
    data?: EnrollmentTokenResponse;
    error?: string;
  }> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await EnrollmentService.generateToken();
      return { success: true, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  return { generateToken, isLoading, error };
}
