"use client";

import { useCallback, useEffect, useState } from "react";
import { UsersService } from "../services/users.service";
import type { CreateUserInput, ManagedUser, PermissionsCatalog, UpdateUserInput } from "../interfaces/user";

export function useUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await UsersService.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createUser = useCallback(async (input: CreateUserInput) => {
    const created = await UsersService.create(input);
    setUsers((prev) => [...prev, created]);
    return created;
  }, []);

  const updateUser = useCallback(async (id: string, input: UpdateUserInput) => {
    const updated = await UsersService.update(id, input);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await UsersService.remove(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return { users, isLoading, error, refresh: load, createUser, updateUser, deleteUser };
}

let catalogCache: PermissionsCatalog | null = null;

export function usePermissionsCatalog() {
  const [catalog, setCatalog] = useState<PermissionsCatalog | null>(catalogCache);
  const [isLoading, setIsLoading] = useState(!catalogCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (catalogCache) return;
    UsersService.getCatalog()
      .then((c) => {
        catalogCache = c;
        setCatalog(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load catalog"))
      .finally(() => setIsLoading(false));
  }, []);

  return { catalog, isLoading, error };
}
