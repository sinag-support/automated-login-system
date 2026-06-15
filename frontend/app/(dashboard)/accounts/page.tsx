'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Trash2, 
  Filter,
  X,
  Phone,
  Store,
  Calendar,
  MoreHorizontal,
  Edit,
  Key,
  RotateCcw
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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

interface Account {
  id: string
  mobileNumber: string
  storeName: string
  loginDay: string
  status: string
  lastLogin: string | null
}

const loginDays = ['Unscheduled', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const statusOptions = [
  { value: 'All', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'success', label: 'Success' },
  { value: 'needs_password_update', label: 'Needs Password' }
]
const ITEMS_PER_PAGE = 20

// Unified badge component
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])  
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [passwordAccount, setPasswordAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLoginDay, setFilterLoginDay] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [newAccount, setNewAccount] = useState({ 
    mobileNumber: '', 
    storeName: '', 
    loginDay: 'Unscheduled' 
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

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
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Unscheduled']
      
      const sortedData = data.sort((a: Account, b: Account) => {
        const dayA = a.loginDay || 'Unscheduled'
        const dayB = b.loginDay || 'Unscheduled'
        return dayOrder.indexOf(dayA) - dayOrder.indexOf(dayB)
      })
      
      setAccounts(sortedData)
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

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
  }

  const handleUpdatePassword = (account: Account) => {
    setPasswordAccount(account)
  }

  const handleSaveEdit = async (id: string, data: Partial<Account>) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        toast.success('Account updated successfully')
        fetchAccounts()
        setEditingAccount(null)
      } else {
        toast.error('Failed to update account')
      }
    } catch (error) {
      toast.error('Failed to update account')
    }
  }

  const handleSavePassword = async (id: string, password: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ customPassword: password })
      })

      if (res.ok) {
        toast.success('Password updated successfully')
        fetchAccounts()
        setPasswordAccount(null)
      } else {
        toast.error('Failed to update password')
      }
    } catch (error) {
      toast.error('Failed to update password')
    }
  }

  const performReset = async () => {
    setIsResetting(true)
    setResetDialogOpen(false)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/accounts/reset-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'All accounts reset to pending')
        fetchAccounts()
      } else {
        toast.error(data.error || 'Reset failed')
      }
    } catch (error) {
      toast.error('Failed to reset accounts')
    } finally {
      setIsResetting(false)
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
      <div className="space-y-6 px-2 sm:px-0">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Filters card skeleton */}
        <Card>
          <CardHeader className="p-4 pb-0">
            <Skeleton className="h-5 w-16" />
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </CardContent>
        </Card>

        {/* Results summary skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>

        {/* Table skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    {[1,2,3,4,5,6].map(i => (
                      <th key={i} className="p-3"><Skeleton className="h-4 w-20" /></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {[1,2,3,4,5,6].map(j => (
                        <td key={j} className="p-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-10 w-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your store accounts and login schedules
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setResetDialogOpen(true)} 
            disabled={isResetting}
          >
            <RotateCcw className={`mr-2 h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
            Reset All to Pending
          </Button>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
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
                    placeholder="639123456789"
                    value={newAccount.mobileNumber}
                    onChange={(e) => setNewAccount({ ...newAccount, mobileNumber: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: 639XXXXXXXXX
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
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? 'Adding...' : 'Add Account'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                className="ml-auto h-7 px-2 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by mobile or store name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterLoginDay} onValueChange={setFilterLoginDay}>
              <SelectTrigger className="flex-1">
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
              <SelectTrigger className="flex-1">
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[180px] py-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> Mobile Number
                    </div>
                  </TableHead>
                  <TableHead className="py-3">
                    <div className="flex items-center gap-2">
                      <Store className="h-3 w-3" /> Store Name
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px] py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Login Day
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px] py-3">Status</TableHead>
                  <TableHead className="w-[180px] py-3">Last Login</TableHead>
                  <TableHead className="w-[80px] py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {filteredAccounts.length === 0 ? 'No accounts found' : 'No accounts on this page'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAccounts.map((account) => (
                    <TableRow key={account.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="py-3 font-mono text-sm">
                        {formatMobileNumber(account.mobileNumber)}
                      </TableCell>
                      <TableCell className="py-3 font-medium">{account.storeName}</TableCell>
                      <TableCell className="py-3">{account.loginDay}</TableCell>
                      <TableCell className="py-3">{getStatusBadge(account.status)}</TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {account.lastLogin ? new Date(account.lastLogin).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdatePassword(account)}>
                              <Key className="mr-2 h-4 w-4" /> Update Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteAccount(account.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

      {/* Edit Account Modal */}
      {editingAccount && (
        <Dialog open={true} onOpenChange={() => setEditingAccount(null)}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>
                Update account information for {editingAccount.mobileNumber}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleSaveEdit(editingAccount.id, {
                storeName: formData.get('storeName') as string,
                loginDay: formData.get('loginDay') as string,
                status: formData.get('status') as string
              })
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input value={editingAccount.mobileNumber} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-store">Store Name</Label>
                <Input
                  id="edit-store"
                  name="storeName"
                  defaultValue={editingAccount.storeName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-day">Login Day</Label>
                <Select name="loginDay" defaultValue={editingAccount.loginDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loginDays.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select name="status" defaultValue={editingAccount.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="needs_password_update">Needs Password</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingAccount(null)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Update Password Modal */}
      {passwordAccount && (
        <Dialog open={true} onOpenChange={() => setPasswordAccount(null)}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Update Password</DialogTitle>
              <DialogDescription>
                Set a custom password for {passwordAccount.storeName}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const password = formData.get('password') as string
              const confirm = formData.get('confirm') as string
              if (password !== confirm) {
                toast.error('Passwords do not match')
                return
              }
              handleSavePassword(passwordAccount.id, password)
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" name="password" type="password" required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" name="confirm" type="password" required minLength={6} />
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setPasswordAccount(null)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">Update Password</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset <strong>ALL</strong> accounts to <strong>Pending</strong> status.
              <br /><br />
              This includes accounts that are already successful. All accounts will be re‑processed the next time automation runs.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, reset all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}