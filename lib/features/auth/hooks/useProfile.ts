"use client";

import { useState, useEffect } from "react";
import type { User } from "@/lib/types";

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || "Failed to load profile");
        } else {
          setUser(data);
        }
      } catch {
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return { user, isLoading, error };
}
