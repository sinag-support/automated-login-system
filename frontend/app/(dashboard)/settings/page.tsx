'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { PasswordInput } from '@/components/ui/password-input'
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
  Settings,
  Lock,
  Database,
  Play,
  Key,
  Save,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')
  const [defaultPassword, setDefaultPassword] = useState('')
  const [defaultPasswordSecondary, setDefaultPasswordSecondary] = useState('')
  const [delayBetweenLogins, setDelayBetweenLogins] = useState('3000')
  const [maxRetries, setMaxRetries] = useState('2')
  const [autoRetry, setAutoRetry] = useState(true)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showDefaultPassword, setShowDefaultPassword] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      
      setAdminEmail(data.admin_email || 'admin@example.com')
      setDefaultPassword(data.default_password || 'Batangas01')
      setDefaultPasswordSecondary(data.default_password_secondary || 'Appwards2025')
      setDelayBetweenLogins(data.delay_between_logins || '3000')
      setMaxRetries(data.max_retries || '2')
      setAutoRetry(data.auto_retry === 'true')
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAllSettings = async () => {
    setIsSaving(true)
    try {
      const settings = {
        admin_email: adminEmail,
        default_password: defaultPassword,
        default_password_secondary: defaultPasswordSecondary,
        delay_between_logins: delayBetweenLogins,
        max_retries: maxRetries,
        auto_retry: String(autoRetry)
      }
      
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        toast.success('All settings saved successfully')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success('Password changed successfully')
        setShowChangePassword(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Failed to change password')
      }
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    toast.promise(
      async () => {
        const res = await fetch('/api/health')
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Database connection failed')
        }
        
        return data
      },
      {
        loading: 'Testing connection...',
        success: (data) => `Database connected successfully!`,
        error: (err) => `Connection failed: ${err.message}`,
      }
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardHeader className="p-4 pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-1" />
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Separator className="my-2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your application settings and preferences
          </p>
        </div>
        <Button onClick={handleSaveAllSettings} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center justify-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">General</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Security</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center justify-center gap-2">
            <Play className="h-4 w-4" />
            <span className="text-sm font-medium">Automation</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">General Settings</CardTitle>
              <CardDescription className="text-xs">
                Configure basic application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="adminEmail" className="text-sm">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Email address for admin notifications and login
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultPassword" className="text-sm">Primary Default Password</Label>
                <div className="relative">
                  <Input
                    id="defaultPassword"
                    type={showDefaultPassword ? 'text' : 'password'}
                    value={defaultPassword}
                    onChange={(e) => setDefaultPassword(e.target.value)}
                    className="pr-10 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                    tabIndex={-1}
                  >
                    {showDefaultPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Primary default password for accounts (overridden by custom password)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultPasswordSecondary" className="text-sm">Secondary Default Password</Label>
                <div className="relative">
                  <Input
                    id="defaultPasswordSecondary"
                    type={showDefaultPassword ? 'text' : 'password'}
                    value={defaultPasswordSecondary}
                    onChange={(e) => setDefaultPasswordSecondary(e.target.value)}
                    className="pr-10 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                    tabIndex={-1}
                  >
                    {showDefaultPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fallback password if primary fails (optional)
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm">Database Connection</Label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      Test your database connection
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleTestConnection} size="sm" className="w-full sm:w-auto">
                    <Database className="mr-2 h-4 w-4" />
                    Test Connection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Security Settings</CardTitle>
              <CardDescription className="text-xs">
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4 sm:space-y-6">
              <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <Key className="mr-2 h-4 w-4" />
                    Change Admin Password
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your current password and a new password
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current">Current Password</Label>
                      <PasswordInput
                        id="current"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new">New Password</Label>
                      <PasswordInput
                        id="new"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm New Password</Label>
                      <PasswordInput
                        id="confirm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          'Change Password'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Use a strong password that you don't use elsewhere
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings */}
        <TabsContent value="automation" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Automation Settings</CardTitle>
              <CardDescription className="text-xs">
                Configure login automation behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="delay" className="text-sm">Delay Between Logins (ms)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={delayBetweenLogins}
                  onChange={(e) => setDelayBetweenLogins(e.target.value)}
                  min="1000"
                  max="10000"
                  step="500"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Time to wait between each login attempt (1000ms = 1 second)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retries" className="text-sm">Max Retries</Label>
                <Select value={maxRetries} onValueChange={setMaxRetries}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 attempt</SelectItem>
                    <SelectItem value="2">2 attempts</SelectItem>
                    <SelectItem value="3">3 attempts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex flex-row items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Auto Retry Failed Logins</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically retry failed login attempts
                  </p>
                </div>
                <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}