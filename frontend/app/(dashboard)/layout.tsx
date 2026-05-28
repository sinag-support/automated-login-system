"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import { BreadcrumbProvider } from "@/components/layout/BreadcrumbContext"
import { MobileBottomNav } from "@/components/layout/MobileBottomNav"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen
  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768) // 768px is typical tablet breakpoint
    }
    checkScreen()
    window.addEventListener("resize", checkScreen)
    return () => window.removeEventListener("resize", checkScreen)
  }, [])

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token && pathname !== "/login") {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [pathname, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Mobile layout
  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          <AppHeader isMobile={true} />
          <main className="flex-1 p-4 pb-20">{children}</main>
          <MobileBottomNav />
        </div>
      </TooltipProvider>
    )
  }

  // Desktop layout
  return (
    <TooltipProvider>
      <SidebarProvider>
        <BreadcrumbProvider>
          <AppSidebar />
          <SidebarInset>
            <AppHeader isMobile={false} />
            <main className="flex-1 p-6">{children}</main>
          </SidebarInset>
        </BreadcrumbProvider>
      </SidebarProvider>
    </TooltipProvider>
  )
}