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
  AlertTriangle,
  Download
} from 'lucide-react'
import { toast } from 'sonner'

interface AccountStatus {
  id: string
  mobileNumber: string
  storeName: string
  loginDay: string
  status: string          // 'success', 'pending', 'needs_password_update'
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

      // Calculate start of week (Monday) in local timezone
      const now = new Date()
      const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ...
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - daysToMonday)
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

  // Use the SAME status counts as Dashboard / Accounts / Schedule
  const total = accounts.length
  const successful = accounts.filter(a => a.status === 'success').length
  const needsPassword = accounts.filter(a => a.status === 'needs_password_update').length
  const pending = accounts.filter(a => a.status === 'pending').length
  
  const byDay = daysOfWeek.reduce((acc, day) => {
    const dayAccounts = accounts.filter(a => a.loginDay === day)
    acc[day] = {
      total: dayAccounts.length,
      success: dayAccounts.filter(a => a.status === 'success').length,
      needsPassword: dayAccounts.filter(a => a.status === 'needs_password_update').length,
    }
    return acc
  }, {} as Record<string, { total: number; success: number; needsPassword: number }>)

  // Weekly progress based on status 'success' (aligns with stat card)
  const completionPercentage = total === 0 ? 0 : Math.round((successful / total) * 100)

  if (loading) return (
    <div className="space-y-6 px-2 sm:px-0">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-96" />
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 pb-6">
      {/* Header - same as Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Current week activity overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards - EXACTLY matching Dashboard & Schedule */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-2 flex justify-between items-center">
            <p className="text-2xl font-bold text-blue-600">{total}</p>
            <Users className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-2 flex justify-between items-center">
            <p className="text-2xl font-bold text-green-600">{successful}</p>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Password</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-2 flex justify-between items-center">
            <p className="text-2xl font-bold text-orange-600">{needsPassword}</p>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-2 flex justify-between items-center">
            <p className="text-2xl font-bold text-amber-600">{pending}</p>
            <Clock className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress - now based on status 'success' */}
      <Card>
        <CardHeader className="px-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Weekly Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pt-0">
          <Progress value={completionPercentage} className="h-2" />
          <p className="text-sm text-center text-muted-foreground mt-2">
            {completionPercentage}% of accounts are marked as Successful
          </p>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="by-day" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> By Day
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - shows status badge (aligned with other pages) */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="px-4 pb-2">
              <CardTitle className="text-base">All Accounts</CardTitle>
              <CardDescription className="text-xs">Current status from database</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {accounts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No accounts found</p>
              ) : (
                accounts.map((acc) => {
                  // Same badge logic as Dashboard / Schedule
                  const getStatusBadge = () => {
                    if (acc.status === 'success') return <Badge variant="default">Success</Badge>
                    if (acc.status === 'needs_password_update') return <Badge variant="outline" className="border-orange-500 text-orange-600">Needs Password</Badge>
                    return <Badge variant="secondary">Pending</Badge>
                  }
                  return (
                    <div key={acc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2">
                      <div>
                        <p className="font-medium">{acc.storeName}</p>
                        <p className="text-xs text-muted-foreground">{acc.mobileNumber}</p>
                      </div>
                      {getStatusBadge()}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Day Tab - now shows success and needsPassword counts from status */}
        <TabsContent value="by-day">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {daysOfWeek.map(day => (
              <Card key={day}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-medium">{day}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium">{byDay[day].total}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Successful</span>
                    <span className="text-green-600 font-medium">{byDay[day].success}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Needs Password</span>
                    <span className="text-orange-600 font-medium">{byDay[day].needsPassword}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}