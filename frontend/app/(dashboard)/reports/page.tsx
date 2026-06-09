'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  FileText, 
  XCircle,
  Download
} from 'lucide-react'
import { toast } from 'sonner'

interface AccountStatus {
  id: string
  mobileNumber: string
  storeName: string
  loginDay: string
  status: string
  lastLogin: string | null
  loggedThisWeek: boolean
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ReportsPage() {
  const [accounts, setAccounts] = useState<AccountStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()

      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1))
      startOfWeek.setHours(0, 0, 0, 0)

      const accountsWithStatus = data.map((acc: any) => ({
        ...acc,
        loggedThisWeek: acc.lastLogin && new Date(acc.lastLogin) >= startOfWeek,
      }))

      setAccounts(accountsWithStatus)
    } catch (error) {
      toast.error('Failed to load current week data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    toast.success('Data refreshed')
  }

  const handleExportCSV = () => {
    const headers = ['Mobile Number', 'Store Name', 'Login Day', 'Status', 'Last Login']
    const rows = accounts.map(a => [
      a.mobileNumber,
      a.storeName,
      a.loginDay,
      a.status.replace(/_/g, ' '),
      a.lastLogin ? new Date(a.lastLogin).toLocaleString() : 'Never'
    ])
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('Report exported')
  }

  const total = accounts.length
  const successful = accounts.filter(a => a.loggedThisWeek).length
  const needsPassword = accounts.filter(a => a.status === 'needs_password_update').length
  const pending = accounts.filter(a => !a.loggedThisWeek && a.status !== 'needs_password_update').length
  
  const byDay = daysOfWeek.reduce((acc, day) => {
    const dayAccounts = accounts.filter(a => a.loginDay === day)
    acc[day] = {
      total: dayAccounts.length,
      success: dayAccounts.filter(a => a.loggedThisWeek).length,
      failed: dayAccounts.filter(a => a.status === 'needs_password_update').length,
    }
    return acc
  }, {} as Record<string, { total: number; success: number; failed: number }>)

  const completionPercentage = total === 0 ? 0 : Math.round((successful / total) * 100)

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-2">Current week live activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: 'Total', val: total, icon: Users, color: 'text-muted-foreground' },
          { title: 'Successful', val: successful, icon: CheckCircle, color: 'text-green-600' },
          { title: 'Needs Pwd', val: needsPassword, icon: XCircle, color: 'text-red-600' },
          { title: 'Pending', val: pending, icon: Clock, color: 'text-yellow-600' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium">{stat.title}</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 flex justify-between items-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.val}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp /> Weekly Progress</CardTitle></CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="h-3" />
          <p className="text-sm text-center mt-2">{completionPercentage}% Complete</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview"><FileText className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="by-day"><Calendar className="mr-2 h-4 w-4" /> By Day</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6 space-y-2">
              {accounts.map(acc => (
                <div key={acc.id} className="flex justify-between p-2 border rounded-lg">
                  <div><p className="font-medium">{acc.storeName}</p><p className="text-xs">{acc.mobileNumber}</p></div>
                  <Badge variant={acc.loggedThisWeek ? 'default' : acc.status === 'needs_password_update' ? 'destructive' : 'secondary'}>
                    {acc.loggedThisWeek ? 'Done' : acc.status === 'needs_password_update' ? 'Needs Password' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="by-day">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {daysOfWeek.map(day => (
              <Card key={day}>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">{day}</CardTitle></CardHeader>
                <CardContent className="p-4 text-xs space-y-1">
                  <div className="flex justify-between"><span>Success</span><span className="text-green-600">{byDay[day].success}</span></div>
                  <div className="flex justify-between"><span>Failed</span><span className="text-red-600">{byDay[day].failed}</span></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}