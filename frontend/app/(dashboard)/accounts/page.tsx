'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Filter, X, Phone, Store, Calendar, MoreHorizontal, Edit, Key } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

interface Account {
  id: string
  mobileNumber: string
  storeName: string
  loginDay: string
  status: string
  lastLogin: string | null
}

const loginDays = ['Unscheduled', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLoginDay, setFilterLoginDay] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [passwordAccount, setPasswordAccount] = useState<Account | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { fetchAccounts() }, [])

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/accounts', { headers: { 'Authorization': `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAccounts(data)
    } catch {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    const token = localStorage.getItem('token')
    await fetch(`/api/accounts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    toast.success('Account deleted')
    fetchAccounts()
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      success: { variant: 'default', label: 'Success' },
      needs_password_update: { variant: 'outline', label: 'Needs Password' }
    }
    const config = variants[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredAccounts = accounts.filter(a => {
    const matchesSearch = a.mobileNumber.includes(searchTerm) || a.storeName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDay = filterLoginDay === 'All' || a.loginDay === filterLoginDay
    const matchesStatus = filterStatus === 'All' || a.status === filterStatus
    return matchesSearch && matchesDay && matchesStatus
  })

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground text-sm">Manage store login schedules and credentials</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}><Plus className="mr-2 h-4 w-4" /> Add Account</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Select value={filterLoginDay} onValueChange={setFilterLoginDay}>
            <SelectTrigger><SelectValue placeholder="All Days" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Days</SelectItem>
              {loginDays.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="needs_password_update">Needs Password</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mobile</TableHead>
              <TableHead>Store Name</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.map((acc) => (
              <TableRow key={acc.id}>
                <TableCell className="font-mono">{acc.mobileNumber}</TableCell>
                <TableCell>{acc.storeName}</TableCell>
                <TableCell>{acc.loginDay}</TableCell>
                <TableCell>{getStatusBadge(acc.status)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingAccount(acc)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPasswordAccount(acc)}><Key className="mr-2 h-4 w-4" /> Password</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteAccount(acc.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}