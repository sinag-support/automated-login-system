'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  Ban,
  AlertCircle
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
  const [isStarting, setIsStarting] = useState(false)
  const [globalWorkflowRunning, setGlobalWorkflowRunning] = useState(false)
  const [runningDay, setRunningDay] = useState<string | null>(null)
  const [isStopping, setIsStopping] = useState(false)
  const [forceStopDialogOpen, setForceStopDialogOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<ScheduleAccount | null>(null)
  const [assignDay, setAssignDay] = useState('Monday')
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  const fetchAccounts = async () => {
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
    }
  }

  const checkGlobalWorkflowStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/workflow/running', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setGlobalWorkflowRunning(data.isRunning || false)
      setRunningDay(data.runningDay || null)
    } catch (error) {
      console.error('Failed to check global workflow status:', error)
    }
  }

  useEffect(() => {
    fetchAccounts()
    checkGlobalWorkflowStatus()
    pollingInterval.current = setInterval(checkGlobalWorkflowStatus, 10000)
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current)
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

  const buttonDisabled = isStarting || globalWorkflowRunning || allAccountsSuccess

  const getButtonTitle = () => {
    if (globalWorkflowRunning) {
      return runningDay 
        ? `Automation is already running for ${runningDay}. Please wait.` 
        : 'Automation is already running. Please wait.'
    }
    if (allAccountsSuccess) {
      return 'All accounts for this day are already successful – nothing to run.'
    }
    return ''
  }

  const handleRunAutomation = async () => {
    setIsStarting(true)
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
          setGlobalWorkflowRunning(false)
        } else {
          toast.success(data.message || `Automation started for ${selectedDay}`)
          setGlobalWorkflowRunning(true)
          setRunningDay(selectedDay)
        }
        setTimeout(() => fetchAccounts(), 5000)
      } else {
        toast.error(data.error || 'Failed to start automation')
      }
    } catch (error) {
      toast.error('Failed to trigger automation')
    } finally {
      setIsStarting(false)
    }
  }

  // Force stop – called after user confirms in AlertDialog
  const handleForceStopConfirm = async () => {
    setForceStopDialogOpen(false)
    if (!runningDay) {
      toast.error('No running day found')
      return
    }
    setIsStopping(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/workflow/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ day: runningDay })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Workflow stopped')
        setGlobalWorkflowRunning(false)
        setRunningDay(null)
        await checkGlobalWorkflowStatus()
        await fetchAccounts()
      } else {
        toast.error(data.error || 'Failed to stop workflow')
      }
    } catch (error) {
      toast.error('Failed to stop workflow')
    } finally {
      setIsStopping(false)
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 sm:w-24" />
            <Skeleton className="h-10 w-10 sm:w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Card>
          <CardHeader className="p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-1" />
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage login schedules by day
          </p>
        </div>
        <div className="flex gap-2">
          {/* Refresh – icon only on mobile */}
          <Button
            variant="outline"
            onClick={fetchAccounts}
            disabled={loading}
            size="sm"
            className="px-2 sm:px-3"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>

          {/* Force Stop – opens AlertDialog, icon only on mobile */}
          {globalWorkflowRunning && (
            <Button
              variant="destructive"
              onClick={() => setForceStopDialogOpen(true)}
              disabled={isStopping}
              size="sm"
              className="px-2 sm:px-3"
            >
              <AlertCircle className={`h-4 w-4 ${isStopping ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline ml-2">Force Stop</span>
            </Button>
          )}

          {/* Run Automation – shows running day */}
          <Button
            onClick={handleRunAutomation}
            disabled={buttonDisabled}
            title={getButtonTitle()}
            size="sm"
          >
            {isStarting || globalWorkflowRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                <span>
                  {globalWorkflowRunning
                    ? `Running ${runningDay || selectedDay} Automation...`
                    : "Starting..."}
                </span>
              </>
            ) : allAccountsSuccess ? (
              <>
                <Ban className="mr-2 h-4 w-4" />
                <span>All Successful</span>
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                <span>Run {selectedDay} Automation</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs and rest of the page – unchanged */}
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
                        <div key={account.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-2">
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

      {/* Assign Day Modal */}
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

      {/* Force Stop AlertDialog */}
      <AlertDialog open={forceStopDialogOpen} onOpenChange={setForceStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will force stop the automation for <strong>{runningDay}</strong> and mark it as <strong>failed</strong>.
              <br /><br />
              Any accounts that were not yet processed will remain <strong>pending</strong> and will be picked up in the next scheduled run.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceStopConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, force stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}