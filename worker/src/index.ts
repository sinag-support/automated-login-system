import 'dotenv/config'
import express from 'express'
import cron from 'node-cron'
import { LoginAutomation } from './automation'
import {
  getAccountsForToday,
  getAccountsForDay,
  updateAccountStatus,
  createLoginLog
} from './db'

const app = express()
const PORT = process.env.PORT || 3001
const API_KEY = process.env.API_KEY || 'dev-api-key'

// Middleware
app.use(express.json())

// Auth middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key']
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// Main automation function
async function runAutomation(day?: string) {
  console.log(`\n🚀 Starting login automation - ${new Date().toISOString()}`)

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

      try {
        // Determine password
        const password = account.customPassword || account.defaultPassword

        // Add random delay between logins (2-5 seconds)
        if (i > 0) {
          await LoginAutomation.delay(2000, 5000)
        }

        // Attempt login
        const result = await automation.login(account.mobile_number, password)

        // Update account status
        const status = result.success ? 'success' : 'needs_password_update'
        await updateAccountStatus(account.id, status)

        // Create log entry
        await createLoginLog(account.id, result.success ? 'success' : 'failed', result.error)

        if (result.success) {
          successCount++
        } else {
          failCount++
        }

        console.log(`  ${result.success ? '✅' : '❌'} Status: ${status}`)
      } catch (error: any) {
        console.error(`  ❌ Error processing account:`, error.message)
        await updateAccountStatus(account.id, 'failed')
        await createLoginLog(account.id, 'failed', error.message)
        failCount++
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
app.post('/run-daily-logins', authMiddleware, async (req, res) => {
  const { day } = req.body
  runAutomation(day).catch(console.error)
  res.json({
    message: 'Login automation started',
    day: day || 'today'
  })
})

app.post('/run-now', authMiddleware, async (req, res) => {
  const { day } = req.body
  runAutomation(day).catch(console.error)
  res.json({
    message: 'Manual automation triggered',
    day: day || 'today'
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.get('/status', authMiddleware, async (req, res) => {
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