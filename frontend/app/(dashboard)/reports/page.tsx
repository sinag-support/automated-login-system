'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  RefreshCw,
  FileText,
  Download,
  AlertCircle,
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

interface WeeklyReport {
  total: number
  successful: number
  failed: number
  pending: number
  needsPassword: number
  byDay: Record<string, { total: number; success: number; failed: number }>
}

interface HistoricalReport {
  id: string
  week_start: string
  week_end: string
  total: number
  successful: number
  failed: number
  pending: number
  needs_password: number
  by_day: Record<string, { total: number; success: number; failed: number }>
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ReportsPage() {
  const [accounts, setAccounts] = useState<AccountStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Historical report state
  const [selectedWeek, setSelectedWeek] = useState<string>('current')
  const [reportHistory, setReportHistory] = useState<HistoricalReport[]>([])
  const [historicalReport, setHistoricalReport] = useState<HistoricalReport | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Current week data
  const fetchCurrentWeekData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()

      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
      startOfWeek.setHours(0, 0, 0, 0)

      const accountsWithStatus = data.map((acc: any) => ({
        ...acc,
        loggedThisWeek: acc.lastLogin && new Date(acc.lastLogin) >= startOfWeek,
      }))

      setAccounts(accountsWithStatus)
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
      toast.error('Failed to load current week data')
    } finally {
      setLoading(false)
    }
  }

  // Fetch list of historical reports
  const fetchReportHistory = async () => {
    try {
      const res = await fetch('/api/worker/report/history')
      if (!res.ok) {
        console.warn('History endpoint not available')
        setReportHistory([])
        return
      }
      const data = await res.json()
      setReportHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch report history:', error)
      setReportHistory([]) // Always set empty array on error
    } finally {
      setLoadingHistory(false)
    }
  }

  // Load a specific historical report
  const loadHistoricalReport = async (id: string) => {
    try {
      const res = await fetch(`/api/worker/report/history/${id}`)
      if (!res.ok) throw new Error('Failed to load report')
      const data = await res.json()
      setHistoricalReport(data)
    } catch (error) {
      toast.error('Could not load historical report')
      setSelectedWeek('current') // fallback
    }
  }

  useEffect(() => {
    fetchCurrentWeekData()
    fetchReportHistory()
  }, [])

  const handleWeekChange = (value: string) => {
    setSelectedWeek(value)
    if (value === 'current') {
      setHistoricalReport(null)
    } else {
      loadHistoricalReport(value)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchCurrentWeekData()
    setRefreshing(false)
    toast.success('Data refreshed')
  }

  const handleExportCSV = () => {
    if (selectedWeek !== 'current') {
      toast.error('Export available only for current week')
      return
    }

    const formatMobileForCSV = (number: string): string => {
      const cleaned = number.replace(/\D/g, '')
      if (cleaned.startsWith('63') && cleaned.length === 12) {
        return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
      }
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
      }
      return cleaned
    }

    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const headers = ['Mobile Number', 'Store Name', 'Login Day', 'Status', 'Last Login', 'Logged This Week']
    const rows = accounts.map(a => [
      escapeCSV(formatMobileForCSV(a.mobileNumber)),
      escapeCSV(a.storeName),
      a.loginDay,
      a.status.replace(/_/g, ' '),
      a.lastLogin ? new Date(a.lastLogin).toLocaleString() : 'Never',
      a.loggedThisWeek ? 'Yes' : 'No',
    ])

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    toast.success('Report exported')
  }

  // Determine which data to display
  const isCurrentWeek = selectedWeek === 'current'
  const reportData: WeeklyReport = isCurrentWeek
    ? {
        total: accounts.length,
        successful: accounts.filter(a => a.loggedThisWeek).length,
        failed: accounts.filter(a => a.status === 'needs_password_update').length,
        pending: accounts.filter(a => !a.loggedThisWeek && a.status !== 'needs_password_update').length,
        needsPassword: accounts.filter(a => a.status === 'needs_password_update').length,
        byDay: daysOfWeek.reduce((acc, day) => {
          const dayAccounts = accounts.filter(a => a.loginDay === day)
          acc[day] = {
            total: dayAccounts.length,
            success: dayAccounts.filter(a => a.loggedThisWeek).length,
            failed: dayAccounts.filter(a => a.status === 'needs_password_update').length,
          }
          return acc
        }, {} as Record<string, { total: number; success: number; failed: number }>),
      }
    : historicalReport
    ? {
        total: historicalReport.total,
        successful: historicalReport.successful,
        failed: historicalReport.failed,
        pending: historicalReport.pending,
        needsPassword: historicalReport.needs_password,
        byDay: historicalReport.by_day || {},
      }
    : {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0,
        needsPassword: 0,
        byDay: {},
      }

  const completionPercentage = reportData.total === 0 ? 0 : Math.round((reportData.successful / reportData.total) * 100)

  if (loading || loadingHistory) {
    return (
      <div className="space-y-6 px-2 sm:px-0">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 pb-6">
      {/* Header with week selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1 sm:mt-2">
            {isCurrentWeek ? 'Current week live activity' : 'Saved weekly snapshot'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedWeek} onValueChange={handleWeekChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Week</SelectItem>
              {reportHistory.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.week_start} – {r.week_end}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isCurrentWeek && (
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="flex items-center justify-between">
              <p className="text-xl sm:text-2xl font-bold">{reportData.total}</p>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="flex items-center justify-between">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{reportData.successful}</p>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Failed / Needs Pwd
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="flex items-center justify-between">
              <p className="text-xl sm:text-2xl font-bold text-red-600">{reportData.failed + reportData.needsPassword}</p>
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="flex items-center justify-between">
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{reportData.pending}</p>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Progress
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {reportData.successful} of {reportData.total} accounts logged in
            {!isCurrentWeek && ` (${selectedWeek})`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <Progress value={completionPercentage} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {completionPercentage}% Complete
          </p>
        </CardContent>
      </Card>

      {/* Overview & By Day Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2">
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">
                {isCurrentWeek ? 'All Accounts Status' : 'Week Summary'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {isCurrentWeek
                  ? 'Current status of all accounts for this week'
                  : `Snapshot for ${selectedWeek}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              {isCurrentWeek ? (
                // Current week: show account list
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {accounts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No accounts found</p>
                  ) : (
                    accounts.map(account => (
                      <div key={account.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 border rounded-lg gap-1">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{account.storeName}</p>
                          <p className="text-xs text-muted-foreground">{account.mobileNumber}</p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                          <Badge variant="outline" className="text-xs">{account.loginDay}</Badge>
                          {account.loggedThisWeek ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Done
                            </Badge>
                          ) : account.status === 'needs_password_update' ? (
                            <Badge variant="destructive" className="text-xs">Needs Password</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Pending</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Historical: summary only
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>Historical week – individual account details not available.</p>
                  <p>See the “By Day” tab for a breakdown.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-day" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {daysOfWeek.map(day => {
              const dayData = reportData.byDay[day] || { total: 0, success: 0, failed: 0 }
              const completed = dayData.success
              const total = dayData.total
              const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

              return (
                <Card key={day}>
                  <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center justify-between">
                      {day}
                      <Badge variant="outline" className="text-xs">{completed}/{total}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                    <Progress value={percentage} className="h-2 mb-2" />
                    <div className="space-y-1 mt-3">
                      {total > 0 ? (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span>Successful</span>
                            <span className="text-green-600">{completed}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>Failed</span>
                            <span className="text-red-600">{dayData.failed}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span>Pending</span>
                            <span className="text-yellow-600">{total - completed - dayData.failed}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center">No accounts</p>
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