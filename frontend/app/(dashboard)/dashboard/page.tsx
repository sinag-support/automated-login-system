'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface Stats {
  total: number
  success: number
  needsPassword: number
  pending: number
  todayLogins: number
}

interface RecentAccount {
  id: string
  mobileNumber: string
  storeName: string
  status: string
  lastLogin: string | null
  loginDay: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    needsPassword: 0,
    pending: 0,
    todayLogins: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentAccount[]>([])
  const [todayAccounts, setTodayAccounts] = useState<RecentAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('No authentication token found')
        setLoading(false)
        return
      }

      const res = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

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

      const recent = accounts
        .filter((a: any) => a.lastLogin)
        .sort((a: any, b: any) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime())
        .slice(0, 5)
      
      setRecentActivity(recent)
      setTodayAccounts(todayAccountsList.slice(0, 5))
    } catch (error: any) {
      setError(error.message)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Updated statCards array for 4 items
  const statCards = [
    { title: 'Total Accounts', value: stats.total, icon: Users, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    { title: 'Successful', value: stats.success, icon: CheckCircle, color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
    { title: 'Needs Action', value: stats.needsPassword, icon: AlertTriangle, color: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
    { title: 'Today\'s Schedule', value: stats.todayLogins, icon: Calendar, color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
  ]

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
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        {/* Adjusted skeleton to match 4-column layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    )
  }

  function formatDateTime(lastLogin: string | null): import("react").ReactNode {
    throw new Error('Function not implemented.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-2">Overview of your login automation system</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => window.location.href = '/accounts'}><Users className="mr-2 h-4 w-4" /> Manage</Button>
          <Button variant="outline" onClick={fetchDashboardData}><Clock className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>
      </div>

      {/* Adjusted grid to 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold">{stat.value}</p>
                <div className={`p-2 rounded-lg ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest login attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((account) => (
                  <div key={account.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{account.storeName}</p>
                      <p className="text-sm text-muted-foreground">{account.mobileNumber}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(account.status)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(account.lastLogin)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>
              Accounts scheduled for {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayAccounts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No accounts scheduled for today
              </p>
            ) : (
              <div className="space-y-4">
                {todayAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{account.storeName}</p>
                      <p className="text-sm text-muted-foreground">{account.mobileNumber}</p>
                    </div>
                    <div>
                      {getStatusBadge(account.status)}
                    </div>
                  </div>
                ))}
                {stats.todayLogins > 5 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    +{stats.todayLogins - 5} more accounts scheduled
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}