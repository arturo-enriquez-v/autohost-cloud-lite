"use client"

import { useState, useEffect, useCallback } from "react"
import { Plan, UserPlan } from "../types"

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlansAndUserPlan = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [plansRes, myPlanRes] = await Promise.all([
        window.fetch("/api/plans", { credentials: "include" }),
        window.fetch("/api/plans/my-plan", { credentials: "include" }),
      ])

      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(plansData)
      }

      if (myPlanRes.ok) {
        const myPlanData = await myPlanRes.json()
        setUserPlan(myPlanData)
      }
    } catch {
      setError("Network error while loading plan information")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlansAndUserPlan()
  }, [fetchPlansAndUserPlan])

  const selectPlan = async (planId: string) => {
    setIsUpdating(true)
    setError(null)
    try {
      const res = await window.fetch("/api/plans/my-plan", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setUserPlan(data)
        return { success: true }
      }

      const msg = data?.error || "Failed to change plan"
      setError(msg)
      return { success: false, error: msg }
    } catch {
      setError("Network error when attempting to change plan")
      return { success: false, error: "Network error" }
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    plans,
    userPlan,
    isLoading,
    isUpdating,
    error,
    refresh: fetchPlansAndUserPlan,
    selectPlan,
  }
}
