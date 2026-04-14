'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppHeader } from '@/components/layout/AppHeader'
import { BreadcrumbProvider } from '@/components/layout/BreadcrumbContext'
import { Skeleton } from '@/components/ui/skeleton'
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

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token && pathname !== '/login') {
      router.push('/login')
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

  return (
    <SidebarProvider>
      <BreadcrumbProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </BreadcrumbProvider>
    </SidebarProvider>
  )
}