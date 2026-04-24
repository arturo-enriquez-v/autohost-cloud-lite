"use client"

import { useState } from "react"
import { Header, Sidebar } from "@/components/layout"
import { ProjectProvider } from "@/lib/context/project-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <ProjectProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          isMobileOpen={mobileOpen}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMobileMenu={() => setMobileOpen((o) => !o)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
          <footer className="border-t border-border px-6 py-3 text-center text-xs text-muted-foreground">
            © AutoHost Cloud 2025
          </footer>
        </div>
      </div>
    </ProjectProvider>
  )
}
