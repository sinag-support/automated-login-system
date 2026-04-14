'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import Papa from 'papaparse'
import { getRandomLoginDay } from '@/lib/utils'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (file: File) => Promise<void>
}

export default function BulkImportModal({ isOpen, onClose, onImport }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      complete: (results) => {
        const data = results.data.slice(0, 5).map((row: any) => ({
          ...row,
          loginDay: getRandomLoginDay()
        }))
        setPreview(data)
      }
    })
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    try {
      await onImport(file)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="relative bg-white rounded-lg max-w-3xl w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bulk Import Accounts</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-500 font-medium"
                  >
                    Upload a CSV file
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    CSV should have 'username' column. Optional: 'customPassword', 'loginDay'
                  </p>
                </div>
              </div>
            </div>

            {file && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  Selected file: {file.name}
                </p>
                {preview.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 rows):</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Username</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Login Day</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {preview.map((row, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm text-gray-900">{row.username}</td>
                              <td className="px-3 py-2 text-sm text-gray-500">{row.loginDay}</td>
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

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Accounts'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}