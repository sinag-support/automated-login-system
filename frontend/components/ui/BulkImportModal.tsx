'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import Papa from 'papaparse'
import { getRandomLoginDay } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (file: File) => Promise<void>
}

export default function BulkImportModal({ isOpen, onClose, onImport }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.slice(0, 5).map((row: any) => ({
          mobileNumber: row.mobileNumber || row.MobileNumber || row.mobile || '',
          storeName: row.storeName || row.StoreName || row.store || row.Store || '',
          loginDay: row.loginDay || row.LoginDay || getRandomLoginDay()
        }))
        setPreview(data)
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`)
      }
    })
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    try {
      await onImport(file)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to import accounts')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Accounts</DialogTitle>
          <DialogDescription>
            Upload a CSV file with your accounts. The file should have columns: 
            mobileNumber, storeName, loginDay (optional)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select CSV File
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  CSV should have 'mobileNumber', 'storeName', and optionally 'loginDay' columns
                </p>
              </div>
            </div>
          </div>

          {file && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Selected: {file.name}
              </p>
              {preview.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Preview (first 5 rows):</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Mobile Number</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Store Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Login Day</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {preview.map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{row.mobileNumber}</td>
                            <td className="px-3 py-2 text-sm">{row.storeName}</td>
                            <td className="px-3 py-2 text-sm">{row.loginDay}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? 'Importing...' : 'Import Accounts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}