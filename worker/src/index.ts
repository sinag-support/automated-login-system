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
  isSuccessfulThisWeek,
  generateWeeklyReport,
  getAccountWeeklyStatus,
  generateWeeklyReportForRange,
  saveWeeklyReport,
  getWeeklyReportById,
  getWeeklyReportHistory
} from './db'

const app = express()
const PORT = process.env.PORT || 3001
const API_KEY = process.env.API_KEY || 'dev-api-key'

// Cache settings
let cachedSettings: Record<string, string> = {}
let lastSettingsFetch = 0
const SETTINGS_CACHE_TTL = 60000

async function refreshSettings() {
  const now = Date.now()
  if (now - lastSettingsFetch > SETTINGS_CACHE_TTL) {
    cachedSettings = await getSettings()
    lastSettingsFetch = now
    console.log('📋 Settings refreshed')
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
  const startTime = new Date()
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🚀 STARTING LOGIN AUTOMATION`)
  console.log(`📅 Date: ${startTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  
  const settings = await refreshSettings()
  const delayMs = parseInt(settings.delay_between_logins || '3000')
  const maxRetries = parseInt(settings.max_retries || '2')
  const autoRetry = settings.auto_retry === 'true'
  
  console.log(`⚙️ Settings: delay=${delayMs}ms, retries=${maxRetries}, autoRetry=${autoRetry}`)

  const automation = new LoginAutomation()
  await automation.initialize()

  try {
    const accounts = day ? await getAccountsForDay(day) : await getAccountsForToday()
    
    // Track weekly status for reporting
    const accountsToProcess = accounts.filter(account => {
      if (account.status === 'success' && isSuccessfulThisWeek(account.last_login)) {
        console.log(`⏭️ SKIP: ${account.store_name} - already logged in this week (${account.last_login})`)
        return false
      }
      
      if (account.status === 'success') {
        console.log(`🔄 RUN: ${account.store_name} - success was from previous week`)
      } else {
        console.log(`🔄 RUN: ${account.store_name} - status is "${account.status}"`)
      }
      return true
    })
    
    console.log(`\n📊 SUMMARY: ${accounts.length} total, ${accountsToProcess.length} to process, ${accounts.length - accountsToProcess.length} skipped\n`)

    let successCount = 0
    let failCount = 0
    const results: any[] = []

    for (let i = 0; i < accountsToProcess.length; i++) {
      const account = accountsToProcess[i]
      console.log(`\n[${i + 1}/${accountsToProcess.length}] 📱 ${account.store_name}`)
      console.log(`   📞 ${account.mobile_number}`)

      let attemptSuccess = false
      let lastError: string | undefined
      
      const maxAttempts = autoRetry ? maxRetries : 1
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt > 1) {
          console.log(`   🔄 Retry ${attempt}/${maxAttempts}`)
          await LoginAutomation.delay(1000, 2000)
        }
        
        try {
          const password = account.customPassword || account.defaultPassword

          if (i > 0 || attempt > 1) {
            const delay = delayMs + Math.floor(Math.random() * 1000) - 500
            await LoginAutomation.delay(delay, delay + 1000)
          }

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

      const status = attemptSuccess ? 'success' : 'needs_password_update'
      await updateAccountStatus(account.id, status)
      await createLoginLog(account.id, attemptSuccess ? 'success' : 'failed', lastError)

      results.push({
        store: account.store_name,
        mobile: account.mobile_number,
        success: attemptSuccess,
        status
      })

      if (attemptSuccess) {
        successCount++
        console.log(`   ✅ SUCCESS - Weekly login complete!`)
      } else {
        failCount++
        console.log(`   ❌ FAILED - Needs password update`)
      }
    }

    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📊 FINAL SUMMARY`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${failCount}`)
    console.log(`⏱️ Duration: ${duration} seconds`)
    console.log(`📅 Completed: ${endTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
    
    return { successCount, failCount, duration, results }
  } catch (error) {
    console.error('❌ Automation failed:', error)
    throw error
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

// NEW: Get weekly report
app.get('/report/weekly', authMiddleware, async (req: Request, res: Response) => {
  try {
    const report = await generateWeeklyReport()
    res.json({
      ...report,
      generatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// NEW: Get account status for current week
app.get('/account/:id/weekly-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const status = await getAccountWeeklyStatus(id)
    res.json(status)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
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

// Save current week's report (called by cron)
app.post('/report/save-weekly', authMiddleware, async (req, res) => {
  try {
    // Calculate the week that just ended
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday
    // If today is Sunday, the week just ended is the previous Monday-Saturday
    // If today is Monday-Saturday, we shouldn't save yet – but the cron will only call this on Sunday
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - (dayOfWeek === 0 ? 1 : dayOfWeek + 1)); // Saturday
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 5); // Monday
    
    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];
    
    // Generate report for that week
    const report = await generateWeeklyReportForRange(startStr, endStr);
    
    await saveWeeklyReport({
      week_start: startStr,
      week_end: endStr,
      ...report
    });
    
    console.log(`📅 Weekly report saved for ${startStr} - ${endStr}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get report history list
app.get('/report/history', authMiddleware, async (req, res) => {
  try {
    const history = await getWeeklyReportHistory();
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific historical report
app.get('/report/history/:id', authMiddleware, async (req, res) => {
  try {
    const report = await getWeeklyReportById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Schedule cron job (8 AM Monday-Saturday)
cron.schedule('0 8 * * 1-6', () => {
  console.log('⏰ Running scheduled automation...')
  runAutomation().catch(console.error)
}, {
  timezone: 'Asia/Manila'
})

// Save last week's report every Sunday at 12:05 AM
cron.schedule('5 0 * * 0', async () => {
  console.log('📅 Saving weekly report...');
  try {
    // Call the save endpoint internally
    const response = await fetch(`http://localhost:${PORT}/report/save-weekly`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY }
    });
    if (response.ok) {
      console.log('✅ Weekly report saved');
    } else {
      console.error('❌ Failed to save weekly report');
    }
  } catch (error) {
    console.error('❌ Error saving weekly report:', error);
  }
}, {
  timezone: 'Asia/Manila'
});

// Weekly reset (Monday 12:01 AM)
cron.schedule('1 0 * * 1', async () => {
  console.log('📅 Monday reset: New week starting...')
  // Optional: Reset statuses if needed
}, {
  timezone: 'Asia/Manila'
})

console.log('📅 Cron job scheduled: 8 AM Monday-Saturday (Asia/Manila)')

app.listen(PORT, () => {
  console.log(`🚂 Worker running on port ${PORT}`)
  console.log(`🔑 API Key: ${API_KEY === 'dev-api-key' ? 'development mode' : 'configured'}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})