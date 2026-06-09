'use client'

import { useEffect, useState, useCallback } from 'react'
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

      setRecentActivity(accounts.filter((a: any) => a.lastLogin).sort((a: any, b: any) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()).slice(0, 5))
      setTodayAccounts(todayAccountsList.slice(0, 5))
    } catch (e) {
      toast.error('Failed to update data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  const formatMobileNumber = (number: string): string => {
    const cleaned = number.replace(/\D/g, '')
    if (cleaned.startsWith('63') && cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
    }
    return number
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary', label: 'Pending' },
      success: { variant: 'default', label: 'Success' },
      needs_password_update: { variant: 'outline', label: 'Needs Password' }
    }
    const config = variants[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6 px-2 sm:px-0">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of login automation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/accounts'}><Users className="mr-2 h-4 w-4" /> Manage Accounts</Button>
          <Button variant="outline" onClick={() => { setRefreshing(true); fetchDashboardData(); }} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Accounts', val: stats.total, icon: Users, color: 'text-blue-600' },
          { title: 'Successful', val: stats.success, icon: CheckCircle, color: 'text-green-600' },
          { title: 'Needs Action', val: stats.needsPassword, icon: AlertTriangle, color: 'text-orange-600' },
          { title: 'Today\'s Schedule', val: stats.todayLogins, icon: Calendar, color: 'text-cyan-600' },
        ].map((s) => (
          <Card key={s.title}>
            <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle></CardHeader>
            <CardContent className="p-4 pt-2 flex justify-between items-center">
              <p className="text-2xl font-bold">{s.val}</p>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp /> Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{a.storeName}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(a.lastLogin)}</p>
                  </div>
                </div>
                {getStatusBadge(a.status)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar /> Today's Schedule</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {todayAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{a.storeName}</p>
                    <p className="text-xs text-muted-foreground">{formatMobileNumber(a.mobileNumber)}</p>
                  </div>
                </div>
                {getStatusBadge(a.status)}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}