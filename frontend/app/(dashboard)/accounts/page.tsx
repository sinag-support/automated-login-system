'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  X,
  Phone,
  Store,
  Calendar,
  MoreHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Account {
  id: string
  mobileNumber: string
  storeName: string
  loginDay: string
  status: string
  lastLogin: string | null
}

const loginDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const statusOptions = [
  { value: 'All', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'needs_password_update', label: 'Needs Password' }
]
const ITEMS_PER_PAGE = 20

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLoginDay, setFilterLoginDay] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [newAccount, setNewAccount] = useState({ 
    mobileNumber: '', 
    storeName: '', 
    loginDay: 'Monday' 
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

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

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()
      setAccounts(data)
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error)
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    try {
      const token = localStorage.getItem('token')
      
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!res.ok) {
        throw new Error('Failed to delete account')
      }

      toast.success('Account deleted successfully')
      fetchAccounts()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete account')
    }
  }

  const formatMobileNumber = (number: string): string => {
    const cleaned = number.replace(/\D/g, '')
    
    if (cleaned.startsWith('63') && cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
    }
    
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
    }
    
    return number
  }

  const validatePHMobileNumber = (number: string): boolean => {
    const cleaned = number.replace(/\D/g, '')
    if (cleaned.match(/^09\d{9}$/)) return true
    if (cleaned.match(/^639\d{9}$/)) return true
    if (number.match(/^\+639\d{9}$/)) return true
    return false
  }

  const standardizeMobileNumber = (number: string): string => {
    let cleaned = number.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = '63' + cleaned.slice(1)
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1)
    return cleaned
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validatePHMobileNumber(newAccount.mobileNumber)) {
      toast.error('Please enter a valid PH mobile number')
      return
    }

    if (!newAccount.storeName.trim()) {
      toast.error('Store name is required')
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const standardizedNumber = standardizeMobileNumber(newAccount.mobileNumber)
      
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newAccount,
          mobileNumber: standardizedNumber
        })
      })

      if (res.ok) {
        toast.success('Account added successfully')
        fetchAccounts()
        setShowAddModal(false)
        setNewAccount({ mobileNumber: '', storeName: '', loginDay: 'Monday' })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add account')
      }
    } catch (error) {
      toast.error('Failed to add account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      success: { variant: 'default' as const, label: 'Success' },
      failed: { variant: 'destructive' as const, label: 'Failed' },
      needs_password_update: { variant: 'outline' as const, label: 'Needs Password' }
    }
    const config = variants[status] || { variant: 'secondary' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.mobileNumber.includes(searchTerm) || 
                         account.storeName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLoginDay = filterLoginDay === 'All' || account.loginDay === filterLoginDay
    const matchesStatus = filterStatus === 'All' || account.status === filterStatus
    return matchesSearch && matchesLoginDay && matchesStatus
  })

  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterLoginDay, filterStatus])

  const hasActiveFilters = searchTerm || filterLoginDay !== 'All' || filterStatus !== 'All'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your store accounts and login schedules
          </p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Enter the account details below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="09123456789 or 639123456789"
                  value={newAccount.mobileNumber}
                  onChange={(e) => setNewAccount({ ...newAccount, mobileNumber: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Format: 09XXXXXXXXX or 639XXXXXXXXX
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store">Store Name *</Label>
                <Input
                  id="store"
                  type="text"
                  placeholder="Main Street Store"
                  value={newAccount.storeName}
                  onChange={(e) => setNewAccount({ ...newAccount, storeName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginDay">Login Day *</Label>
                <Select
                  value={newAccount.loginDay}
                  onValueChange={(value) => setNewAccount({ ...newAccount, loginDay: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {loginDays.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setFilterLoginDay('All')
                  setFilterStatus('All')
                }}
                className="ml-auto"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by mobile or store name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterLoginDay} onValueChange={setFilterLoginDay}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Login Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Days</SelectItem>
                {loginDays.map(day => (
                  <SelectItem key={day} value={day}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredAccounts.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + ITEMS_PER_PAGE, filteredAccounts.length)} of{' '}
          {filteredAccounts.length} accounts
        </p>
        <Badge variant="outline">{filteredAccounts.length} total</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Mobile Number
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Store className="h-3 w-3" />
                    Store Name
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Login Day
                  </div>
                </TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[180px]">Last Login</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {filteredAccounts.length === 0 
                      ? 'No accounts found' 
                      : 'No accounts on this page'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-sm">
                      {formatMobileNumber(account.mobileNumber)}
                    </TableCell>
                    <TableCell className="font-medium">{account.storeName}</TableCell>
                    <TableCell>{account.loginDay}</TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.lastLogin 
                        ? new Date(account.lastLogin).toLocaleString() 
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteAccount(account.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setCurrentPage(pageNum)}
                    isActive={currentPage === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}