"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"
import {
  fetchNotificationSummary,
  acknowledgeNotifications,
  type NotificationAlertItem,
  type NotificationLogItem,
} from "@/lib/features/notifications/api"

interface NotificationsContextValue {
  unreadAlerts: number
  unreadLogs: number
  totalUnread: number
  recentAlerts: NotificationAlertItem[]
  recentLogs: NotificationLogItem[]
  isLoading: boolean
  markAlertsAsRead: () => Promise<void>
  markLogsAsRead: () => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [unreadLogs, setUnreadLogs] = useState(0)
  const [recentAlerts, setRecentAlerts] = useState<NotificationAlertItem[]>([])
  const [recentLogs, setRecentLogs] = useState<NotificationLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const unreadAlertsRef = useRef(0)
  const unreadLogsRef = useRef(0)
  unreadAlertsRef.current = unreadAlerts
  unreadLogsRef.current = unreadLogs

  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchNotificationSummary()
      setUnreadAlerts(data.unread_alerts_count)
      setUnreadLogs(data.unread_logs_count)
      setRecentAlerts(data.recent_alerts || [])
      setRecentLogs(data.recent_logs || [])
    } catch (err) {
      // Silently catch in background poll
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load and periodic polling (every 20 seconds, only when tab is visible)
  useEffect(() => {
    loadSummary()

    let intervalId: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (!intervalId && !document.hidden) {
        intervalId = setInterval(loadSummary, 20000)
      }
    }

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    startPolling()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        loadSummary()
        startPolling()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [loadSummary])

  const markAlertsAsRead = useCallback(async () => {
    setUnreadAlerts(0)
    try {
      await acknowledgeNotifications("alerts")
    } catch (err) {
      console.error("Failed to mark alerts as read:", err)
    }
  }, [])

  const markLogsAsRead = useCallback(async () => {
    setUnreadLogs(0)
    try {
      await acknowledgeNotifications("logs")
    } catch (err) {
      console.error("Failed to mark logs as read:", err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setUnreadAlerts(0)
    setUnreadLogs(0)
    try {
      await acknowledgeNotifications("all")
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }, [])

  // Auto-clear when navigating into /alerts or /logs
  useEffect(() => {
    if (!pathname) return

    if (pathname === "/alerts" || pathname.startsWith("/alerts")) {
      if (unreadAlertsRef.current > 0) {
        markAlertsAsRead()
      }
    } else if (pathname === "/logs" || pathname.startsWith("/logs")) {
      if (unreadLogsRef.current > 0) {
        markLogsAsRead()
      }
    }
  }, [pathname, markAlertsAsRead, markLogsAsRead])

  const totalUnread = unreadAlerts + unreadLogs

  return (
    <NotificationsContext.Provider
      value={{
        unreadAlerts,
        unreadLogs,
        totalUnread,
        recentAlerts,
        recentLogs,
        isLoading,
        markAlertsAsRead,
        markLogsAsRead,
        markAllAsRead,
        refresh: loadSummary,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}
