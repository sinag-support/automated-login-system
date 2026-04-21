import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cron from 'node-cron'
import { LoginAutomation } from './automation'
import {
  getAccountsForToday,
  getAccountsForDay,
  updateAccountStatus,
  createLoginLog,
  getSettings,
  getSetting
} from './db'

const app = express()
const PORT = process.env.PORT || 3001
const API_KEY = process.env.API_KEY || 'dev-api-key'

// Cache settings
let cachedSettings: Record<string, string> = {}
let lastSettingsFetch = 0
const SETTINGS_CACHE_TTL = 60000 // 1 minute

async function refreshSettings() {
  const now = Date.now()
  if (now - lastSettingsFetch > SETTINGS_CACHE_TTL) {
    cachedSettings = await getSettings()
    lastSettingsFetch = now
    console.log('📋 Settings refreshed:', Object.keys(cachedSettings).length, 'keys')
  }
  return cachedSettings
}

// Middleware
app.use(express.json())

// Auth middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key']
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// Main automation function
async function runAutomation(day?: string) {
  console.log(`\n🚀 Starting login automation - ${new Date().toISOString()}`)
  
  // Refresh settings before running
  const settings = await refreshSettings()
  
  // Get automation settings
  const delayMs = parseInt(settings.delay_between_logins || '3000')
  const maxRetries = parseInt(settings.max_retries || '2')
  const autoRetry = settings.auto_retry === 'true'
  
  console.log(`⚙️ Settings: delay=${delayMs}ms, retries=${maxRetries}, autoRetry=${autoRetry}`)

  const automation = new LoginAutomation()
  await automation.initialize()

  try {
    const accounts = day ? await getAccountsForDay(day) : await getAccountsForToday()
    console.log(`📋 Found ${accounts.length} accounts to process`)

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i]
      console.log(`\n[${i + 1}/${accounts.length}] Processing: ${account.store_name} (${account.mobile_number})`)

      let attemptSuccess = false
      let lastError: string | undefined
      
      const maxAttempts = autoRetry ? maxRetries : 1
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt > 1) {
          console.log(`  🔄 Retry attempt ${attempt}/${maxAttempts}`)
          await LoginAutomation.delay(1000, 2000)
        }
        
        try {
          // Determine password
          const password = account.customPassword || account.defaultPassword

          // Add delay between accounts (use setting)
          if (i > 0 || attempt > 1) {
            await LoginAutomation.delay(delayMs - 500, delayMs + 500)
          }

          // Attempt login
          const result = await automation.login(account.mobile_number, password)
          
          if (result.success) {
            attemptSuccess = true
            break
          } else {
            lastError = result.error
          }
        } catch (error: any) {
          lastError = error.message
        }
      }

      // Update account status
      const status = attemptSuccess ? 'success' : 'needs_password_update'
      await updateAccountStatus(account.id, status)

      // Create log entry
      await createLoginLog(account.id, attemptSuccess ? 'success' : 'failed', lastError)

      if (attemptSuccess) {
        successCount++
        console.log(`  ✅ Status: success`)
      } else {
        failCount++
        console.log(`  ❌ Status: needs_password_update`)
      }
    }

    console.log(`\n📊 Summary: ${successCount} successful, ${failCount} failed`)
    console.log(`✅ Automation completed - ${new Date().toISOString()}\n`)
  } catch (error) {
    console.error('❌ Automation failed:', error)
  } finally {
    await automation.cleanup()
  }
}

// API Routes
app.post('/run-daily-logins', authMiddleware, async (req: Request, res: Response) => {
  const { day } = req.body
  runAutomation(day).catch(console.error)
  res.json({
    message: 'Login automation started',
    day: day || 'today'
  })
})

app.post('/run-now', authMiddleware, async (req: Request, res: Response) => {
  const { day } = req.body
  runAutomation(day).catch(console.error)
  res.json({
    message: 'Manual automation triggered',
    day: day || 'today'
  })
})

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.get('/settings', authMiddleware, async (req: Request, res: Response) => {
  const settings = await refreshSettings()
  res.json(settings)
})

app.get('/status', authMiddleware, async (req: Request, res: Response) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const stats: Record<string, number> = {}

  for (const day of days) {
    const accounts = await getAccountsForDay(day)
    stats[day] = accounts.length
  }

  res.json({
    status: 'running',
    scheduledAccounts: stats,
    total: Object.values(stats).reduce((a, b) => a + b, 0)
  })
})

// Schedule cron job (8 AM Monday-Saturday)
cron.schedule('0 8 * * 1-6', () => {
  console.log('⏰ Running scheduled automation...')
  runAutomation().catch(console.error)
}, {
  timezone: 'Asia/Manila'
})

console.log('📅 Cron job scheduled: 8 AM Monday-Saturday (Asia/Manila)')

app.listen(PORT, () => {
  console.log(`🚂 Worker running on port ${PORT}`)
  console.log(`🔑 API Key: ${API_KEY === 'dev-api-key' ? 'development mode' : 'configured'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})