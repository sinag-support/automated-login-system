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
  XCircle,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  RefreshCw,
  FileText,
  Download
} from 'lucide-react'
import { toast } from 'sonner'

interface WeeklyReport {
  total: number
  successful: number
  failed: number
  pending: number
  byDay: Record<string, { total: number; success: number; failed: number }>
  generatedAt: string
}

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
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [accounts, setAccounts] = useState<AccountStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchReport()
    fetchAccounts()
  }, [])

  const fetchReport = async () => {
    try {
      const res = await fetch('/api/worker/report')
      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error('Failed to fetch report:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      
      // Check which accounts logged in this week
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
      startOfWeek.setHours(0, 0, 0, 0)
      
      const accountsWithStatus = data.map((acc: any) => ({
        ...acc,
        loggedThisWeek: acc.lastLogin && new Date(acc.lastLogin) >= startOfWeek
      }))
      
      setAccounts(accountsWithStatus)
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([fetchReport(), fetchAccounts()])
    setRefreshing(false)
    toast.success('Report refreshed')
  }

  const handleExportCSV = () => {
    const csv = [
      ['Mobile Number', 'Store Name', 'Login Day', 'Status', 'Last Login', 'Logged This Week'],
      ...accounts.map(a => [
        a.mobileNumber,
        a.storeName,
        a.loginDay,
        a.status,
        a.lastLogin || 'Never',
        a.loggedThisWeek ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    
    toast.success('Report exported')
  }

  const getCompletionPercentage = () => {
    if (!report) return 0
    if (report.total === 0) return 0
    return Math.round((report.successful / report.total) * 100)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const completionPercentage = getCompletionPercentage()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Weekly login activity and account status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">{accounts.length}</p>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Logged In This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-green-600">
                {accounts.filter(a => a.loggedThisWeek).length}
              </p>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-yellow-600">
                {accounts.filter(a => !a.loggedThisWeek && a.status !== 'needs_password_update').length}
              </p>
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold text-red-600">
                {accounts.filter(a => a.status === 'needs_password_update').length}
              </p>
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Progress
          </CardTitle>
          <CardDescription>
            {accounts.filter(a => a.loggedThisWeek).length} of {accounts.length} accounts logged in this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {completionPercentage}% Complete
          </p>
        </CardContent>
      </Card>

      {/* By Day Breakdown */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="by-day">
            <Calendar className="mr-2 h-4 w-4" />
            By Day
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Accounts Status</CardTitle>
              <CardDescription>
                Current status of all accounts for this week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {accounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{account.storeName}</p>
                      <p className="text-xs text-muted-foreground">{account.mobileNumber}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{account.loginDay}</Badge>
                      {account.loggedThisWeek ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Done
                        </Badge>
                      ) : account.status === 'needs_password_update' ? (
                        <Badge variant="destructive">Needs Password</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-day" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {daysOfWeek.map(day => {
              const dayAccounts = accounts.filter(a => a.loginDay === day)
              const completed = dayAccounts.filter(a => a.loggedThisWeek).length
              const total = dayAccounts.length
              const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
              
              return (
                <Card key={day}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      {day}
                      <Badge variant="outline">{completed}/{total}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={percentage} className="h-2 mb-2" />
                    <div className="space-y-1 mt-3">
                      {dayAccounts.slice(0, 5).map(acc => (
                        <div key={acc.id} className="flex items-center justify-between text-xs">
                          <span className="truncate max-w-[120px]">{acc.storeName}</span>
                          {acc.loggedThisWeek ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : acc.status === 'needs_password_update' ? (
                            <XCircle className="h-3 w-3 text-red-600" />
                          ) : (
                            <Clock className="h-3 w-3 text-yellow-600" />
                          )}
                        </div>
                      ))}
                      {dayAccounts.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-1">
                          +{dayAccounts.length - 5} more
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}