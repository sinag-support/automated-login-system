'use client'

import { useState } from 'react'
import { Edit, Key, Trash2 } from 'lucide-react'
import { Account } from '@/types'
import { formatDate, getStatusColor } from '@/lib/utils'
import EditAccountModal from './EditAccountModal'
import UpdatePasswordModal from './UpdatePasswordModal'

interface AccountTableProps {
  accounts: Account[]
  loading: boolean
  onEdit: (account: Account) => void
  onDelete: (id: string) => void
  onUpdate: () => void
}

export default function AccountTable({ accounts, loading, onDelete, onUpdate }: AccountTableProps) {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [passwordAccount, setPasswordAccount] = useState<Account | null>(null)

  const handleUpdateAccount = async (id: string, data: any) => {
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
        onUpdate()
        setEditingAccount(null)
      }
    } catch (error) {
      console.error('Failed to update account:', error)
    }
  }

  const handleUpdatePassword = async (id: string, password: string) => {
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
        onUpdate()
        setPasswordAccount(null)
      }
    } catch (error) {
      console.error('Failed to update password:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <>
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Login Day
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {account.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {account.loginDay}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(account.status)}`}>
                    {account.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(account.lastLogin)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                  <button
                    onClick={() => setEditingAccount(account)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit className="h-4 w-4 inline" />
                  </button>
                  <button
                    onClick={() => setPasswordAccount(account)}
                    className="text-yellow-600 hover:text-yellow-900"
                  >
                    <Key className="h-4 w-4 inline" />
                  </button>
                  <button
                    onClick={() => onDelete(account.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          isOpen={true}
          onClose={() => setEditingAccount(null)}
          onSubmit={(data) => handleUpdateAccount(editingAccount.id, data)}
        />
      )}

      {passwordAccount && (
        <UpdatePasswordModal
          account={passwordAccount}
          isOpen={true}
          onClose={() => setPasswordAccount(null)}
          onSubmit={(password) => handleUpdatePassword(passwordAccount.id, password)}
        />
      )}
    </>
  )
}