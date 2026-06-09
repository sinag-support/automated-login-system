'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, CheckCircle, AlertTriangle, Clock, TrendingUp, Calendar, RefreshCw, Store } from 'lucide-react'
import { toast } from 'sonner'

const formatDateTime = (date: string | null) => {
  if (!date) return 'Never'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Invalid Date'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const day = d.getDate()
  const year = d.getFullYear()
  let hours = d.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${month} ${day}, ${year} - ${hours}:${minutes} ${ampm}`
}

const formatMobileNumber = (number: string): string => {
  const cleaned = number.replace(/\D/g, '')
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
  }
  return number
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'success':
      return <Badge variant="default">Success</Badge>
    case 'needs_password_update':
      return <Badge variant="outline" className="border-orange-500 text-orange-600">Needs Password</Badge>
    default:
      return <Badge variant="secondary">Pending</Badge>
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, success: 0, needsPassword: 0, pending: 0, todayLogins: 0 })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [todayAccounts, setTodayAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const accounts = await res.json()
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const today = days[new Date().getDay()]
      const todayAccountsList = accounts.filter((a: any) => a.loginDay === today)
      
      setStats({
        total: accounts.length,
        success: accounts.filter((a: any) => a.status === 'success').length,
        needsPassword: accounts.filter((a: any) => a.status === 'needs_password_update').length,
        pending: accounts.filter((a: any) => a.status === 'pending').length,
        todayLogins: todayAccountsList.length
      })

      setRecentActivity(
        accounts
          .filter((a: any) => a.lastLogin)
          .sort((a: any, b: any) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime())
          .slice(0, 5)
      )
      setTodayAccounts(todayAccountsList.slice(0, 5))
    } catch (e) {
      toast.error('Failed to update data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  // Loading skeleton – matches the final layout
  if (loading) {
    return (
      <div className="space-y-6 px-2 sm:px-0">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 mt-1" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
          {/* Today's Schedule skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 mt-1" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of login automation</p>
        </div>
        <div className="flex gap-2">
          <Link href="/accounts" passHref>
            <Button>
              <Users className="mr-2 h-4 w-4" /> Manage Accounts
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => { setRefreshing(true); fetchDashboardData(); }} 
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards – aligned with Schedule & Reports */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex justify-between items-center">
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            <Users className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex justify-between items-center">
            <p className="text-2xl font-bold text-green-600">{stats.success}</p>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Password</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex justify-between items-center">
            <p className="text-2xl font-bold text-orange-600">{stats.needsPassword}</p>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex justify-between items-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <Clock className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      {/* Two‑column list cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No recent activity</p>
            ) : (
              recentActivity.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{a.storeName}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(a.lastLogin)}</p>
                    </div>
                  </div>
                  {getStatusBadge(a.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayAccounts.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">No accounts scheduled for today</p>
            ) : (
              todayAccounts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{a.storeName}</p>
                      <p className="text-xs text-muted-foreground">{formatMobileNumber(a.mobileNumber)}</p>
                    </div>
                  </div>
                  {getStatusBadge(a.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}