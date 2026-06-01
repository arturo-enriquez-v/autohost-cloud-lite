"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertService } from "../services/alert.service";
import type { AlertEvent } from "../interfaces/alert";
import type { AlertFilters } from "../fetch/alert.server";

export type { AlertFilters };

const PAGE_SIZE = 20;

export function useAlertEvents() {
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AlertFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number, f: AlertFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const offset = (p - 1) * PAGE_SIZE;
      const result = await AlertService.getAlertEvents(PAGE_SIZE, offset, f);
      setEvents(result.events);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(page, filters);
  }, [page, filters, fetchPage]);

  const applyFilters = useCallback((newFilters: AlertFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    fetchPage(page, filters);
  }, [fetchPage, page, filters]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    events,
    total,
    isLoading,
    error,
    refresh,
    page,
    setPage,
    totalPages,
    filters,
    applyFilters,
  };
}
