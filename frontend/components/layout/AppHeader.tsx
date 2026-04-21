'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppBreadcrumb } from './AppBreadcrumb'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function AppHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex h-6 items-center">
        <Separator orientation="vertical" className="h-6" />
      </div>
      <AppBreadcrumb />
      <div className="ml-auto flex items-center gap-4">
        <form className="hidden lg:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-[200px] pl-8 lg:w-[300px]"
            />
          </div>
        </form>
        <ThemeToggle />
      </div>
    </header>
  )
}