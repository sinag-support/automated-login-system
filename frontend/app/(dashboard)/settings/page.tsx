'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Bell,
  Database,
  Play,
  Key,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [adminEmail, setAdminEmail] = useState('admin@example.com')
  const [defaultPassword, setDefaultPassword] = useState('Password01')
  const [delayBetweenLogins, setDelayBetweenLogins] = useState('3000')
  const [maxRetries, setMaxRetries] = useState('2')
  const [notifications, setNotifications] = useState(true)
  const [autoRetry, setAutoRetry] = useState(true)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveGeneral = async () => {
    setIsSaving(true)
    try {
      // Save settings to API
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Settings saved successfully')
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

    setIsSaving(true)
    try {
      // Update password via API
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Password changed successfully')
      setShowChangePassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        toast.success('Database connection successful')
      } else {
        toast.error('Database connection failed')
      }
    } catch (error) {
      toast.error('Failed to test connection')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your application settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="automation">
            <Play className="mr-2 h-4 w-4" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Email address for admin notifications and login
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultPassword">Default Password</Label>
                <Input
                  id="defaultPassword"
                  type="text"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Default password for new accounts
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Database Connection</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Test your database connection
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleTestConnection}>
                    <Database className="mr-2 h-4 w-4" />
                    Test Connection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Key className="mr-2 h-4 w-4" />
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Enter your current password and a new password
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current">Current Password</Label>
                      <Input
                        id="current"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new">New Password</Label>
                      <Input
                        id="new"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm New Password</Label>
                      <Input
                        id="confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Changing...' : 'Change Password'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Use a strong password that you don't use elsewhere
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Settings */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
              <CardDescription>
                Configure login automation behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="delay">Delay Between Logins (ms)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={delayBetweenLogins}
                  onChange={(e) => setDelayBetweenLogins(e.target.value)}
                  min="1000"
                  max="10000"
                  step="500"
                />
                <p className="text-xs text-muted-foreground">
                  Time to wait between each login attempt (1000ms = 1 second)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retries">Max Retries</Label>
                <Select value={maxRetries} onValueChange={setMaxRetries}>
                  <SelectTrigger>
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

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Retry Failed Logins</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically retry failed login attempts
                  </p>
                </div>
                <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for important events
                  </p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>

              {notifications && (
                <>
                  <Separator />
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      You will receive notifications for:
                      <ul className="list-disc list-inside mt-2 text-sm">
                        <li>Failed login attempts</li>
                        <li>Password update required</li>
                        <li>Automation completion</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveGeneral} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  )
}