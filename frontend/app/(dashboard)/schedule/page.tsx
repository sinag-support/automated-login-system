'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  Calendar, 
  Clock, 
  Users, 
  Store, 
  Phone,
  CheckCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  Ban
} from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleAccount {
  id: string
  mobileNumber: string
  storeName: string
  loginDay: string
  status: string
  lastLogin: string | null
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const scheduleDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Key for localStorage
const AUTOMATION_STORAGE_KEY = 'schedule_automation_running'

export default function SchedulePage() {
  const [accounts, setAccounts] = useState<ScheduleAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay()
    const dayMap: Record<number, string> = {
      1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday'
    }
    return dayMap[today] || 'Monday'
  })
  const [isRunning, setIsRunning] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ScheduleAccount | null>(null)
  const [assignDay, setAssignDay] = useState('Monday')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const accountsRef = useRef(accounts)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    accountsRef.current = accounts
  }, [accounts])

  const fetchAccounts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Please log in again')
        return
      }

      const res = await fetch('/api/accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to fetch accounts')
      
      const data = await res.json()
      setAccounts(data)
    } catch (error) {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Check if there are pending accounts for a given day
  const hasPendingAccounts = useCallback((day: string) => {
    return accountsRef.current.some(a => a.loginDay === day && a.status === 'pending')
  }, [])

  // Start polling – also stores state in localStorage
  const startPolling = useCallback((day: string) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    // Save to localStorage that automation is running for this day
    localStorage.setItem(AUTOMATION_STORAGE_KEY, JSON.stringify({
      day,
      startedAt: Date.now()
    }))

    const poll = async () => {
      await fetchAccounts()
      const stillPending = hasPendingAccounts(day)
      if (!stillPending) {
        // Automation finished
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        localStorage.removeItem(AUTOMATION_STORAGE_KEY)
        setIsRunning(false)
        toast.success(`Automation for ${day} completed!`)
      }
    }

    pollIntervalRef.current = setInterval(poll, 10000)
  }, [fetchAccounts, hasPendingAccounts])

  // On mount, check if there's a stored automation that might still be running
  useEffect(() => {
    const stored = localStorage.getItem(AUTOMATION_STORAGE_KEY)
    if (stored) {
      try {
        const { day, startedAt } = JSON.parse(stored)
        // If it's been less than 2 hours (GitHub Action max time) and there are still pending accounts
        if (Date.now() - startedAt < 2 * 60 * 60 * 1000 && hasPendingAccounts(day)) {
          setIsRunning(true)
          startPolling(day)
          toast.info(`Resuming monitoring for ${day} automation...`)
        } else {
          // Stale entry – remove
          localStorage.removeItem(AUTOMATION_STORAGE_KEY)
        }
      } catch (e) {
        localStorage.removeItem(AUTOMATION_STORAGE_KEY)
      }
    }
  }, [hasPendingAccounts, startPolling])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const getDayAccounts = (day: string) => {
    return accounts.filter(a => a.loginDay === day)
  }

  const getDayStats = (day: string) => {
    const dayAccounts = getDayAccounts(day)
    return {
      total: dayAccounts.length,
      success: dayAccounts.filter(a => a.status === 'success').length,
      pending: dayAccounts.filter(a => a.status === 'pending').length,
      needsPassword: dayAccounts.filter(a => a.status === 'needs_password_update').length
    }
  }

  const allAccountsSuccess = useMemo(() => {
    const dayAccounts = getDayAccounts(selectedDay)
    return dayAccounts.length > 0 && dayAccounts.every(a => a.status === 'success')
  }, [accounts, selectedDay])

  const handleRunAutomation = async () => {
    setIsRunning(true)
    try {
      const res = await fetch('/api/worker/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ day: selectedDay })
      })

      const data = await res.json()

      if (res.ok) {
        if (data.skippedAll) {
          toast.info(data.message || 'All accounts are already successful – nothing to run.')
          setIsRunning(false)
        } else {
          toast.success(data.message || `Automation started for ${selectedDay}`)
          startPolling(selectedDay)
        }
      } else {
        toast.error(data.error || 'Failed to start automation')
        setIsRunning(false)
      }
    } catch (error) {
      toast.error('Failed to trigger automation')
      setIsRunning(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchAccounts()
    toast.success('Accounts refreshed')
  }

  const handleAssignDay = async () => {
    if (!selectedAccount) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ loginDay: assignDay })
      })

      if (res.ok) {
        toast.success(`Assigned to ${assignDay}`)
        fetchAccounts()
        setAssignModalOpen(false)
        setSelectedAccount(null)
      } else {
        toast.error('Failed to assign day')
      }
    } catch (error) {
      toast.error('Failed to assign day')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      success: { variant: 'default' as const, label: 'Success' },
      needs_password_update: { variant: 'outline' as const, label: 'Needs Password' }
    }
    const config = variants[status] || { variant: 'secondary' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatMobileNumber = (number: string): string => {
    const cleaned = number.replace(/\D/g, '')
    if (cleaned.startsWith('63') && cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
    }
    return number
  }

  if (loading) {
    return (
      <div className="space-y-6 px-2 sm:px-0">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage login schedules by day
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleRunAutomation} 
            disabled={isRunning || allAccountsSuccess}
            title={allAccountsSuccess ? "All accounts are already successful – nothing to run" : ""}
          >
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Automation Running...
              </>
            ) : allAccountsSuccess ? (
              <>
                <Ban className="mr-2 h-4 w-4" />
                All Successful
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run {selectedDay} Automation
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={selectedDay} onValueChange={setSelectedDay} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          {daysOfWeek.map(day => (
            <TabsTrigger key={day} value={day} className="text-xs sm:text-sm px-1 sm:px-3">
              {day.slice(0, 3)}
            </TabsTrigger>
          ))}
        </TabsList>

        {daysOfWeek.map(day => {
          const stats = getDayStats(day)
          const dayAccounts = getDayAccounts(day)
          
          return (
            <TabsContent key={day} value={day} className="space-y-4 sm:space-y-6">
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

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                    {day} Accounts ({stats.total})
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Accounts scheduled for login on {day}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  {dayAccounts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No accounts scheduled for {day}
                    </p>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {dayAccounts.map((account) => (
                        <div key={account.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Store className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{account.storeName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span className="truncate">{formatMobileNumber(account.mobileNumber)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 ml-10 sm:ml-0">
                            {getStatusBadge(account.status)}
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              <Clock className="inline h-3 w-3 mr-1" />
                              {account.lastLogin 
                                ? new Date(account.lastLogin).toLocaleTimeString() 
                                : 'Never'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Login Day</DialogTitle>
            <DialogDescription>
              Choose a day for {selectedAccount?.storeName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Day</Label>
              <Select value={assignDay} onValueChange={setAssignDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scheduleDays.map(day => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAssignModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleAssignDay} className="w-full sm:w-auto">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}