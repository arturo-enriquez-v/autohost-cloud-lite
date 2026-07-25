"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types";

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (payload: { name?: string; avatar_url?: string }) => {
    setIsUpdating(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "Failed to update profile";
        setError(msg);
        return { success: false, error: msg };
      }
      setUser(data);
      return { success: true, user: data as User };
    } catch {
      const msg = "Network error";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsUpdating(false);
    }
  };

  return { user, isLoading, isUpdating, error, reload: fetchProfile, updateProfile };
}
