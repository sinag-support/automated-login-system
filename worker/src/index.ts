import 'dotenv/config'
import { LoginAutomation } from './automation'
import { updateAccountStatus, createLoginLog, getAccountsByStatusAndDay, supabase, getSettings } from './db'

// Spread logins over 6 hours (6am – 12pm Manila time)
const SIX_HOURS_MS = 6 * 60 * 60 * 1000

async function markWorkflowRun(day: string, status: 'completed' | 'failed') {
  const { error } = await supabase
    .from('workflow_runs')
    .update({ status, completed_at: new Date().toISOString() })
    .eq('day', day)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error(`Failed to mark workflow as ${status}:`, error)
  }
}

async function processPendingTasks() {
  const targetDay = process.env.TARGET_DAY

  if (!targetDay) {
    console.error("❌ TARGET_DAY environment variable not set. Exiting.")
    process.exit(1)
  }

  console.log(`🎯 Processing accounts for: ${targetDay}`)

  // Fetch settings once
  const settings = await getSettings()
  const primaryDefault = settings.default_password || 'Batangas01'
  const secondaryDefault = settings.default_password_secondary || 'Appwards2025'
  console.log(`🔑 Default passwords: primary='${primaryDefault}', secondary='${secondaryDefault}'`)

  // Get pending accounts for this day
  const pendingAccounts = await getAccountsByStatusAndDay('pending', targetDay)

  if (pendingAccounts.length === 0) {
    console.log(`✅ No pending accounts for ${targetDay}. Exiting.`)
    await markWorkflowRun(targetDay, 'completed')
    process.exit(0)
  }

  console.log(`📋 Found ${pendingAccounts.length} accounts to process.`)

  // Randomly assign each account an offset (0 to 6 hours)
  const accountsWithOffset = pendingAccounts.map(account => ({
    ...account,
    offset: Math.floor(Math.random() * SIX_HOURS_MS)
  }))

  // Sort by offset (ascending)
  accountsWithOffset.sort((a, b) => a.offset - b.offset)

  const automation = new LoginAutomation()
  let hasError = false
  let previousOffset = 0

  try {
    await automation.initialize()

    for (const account of accountsWithOffset) {
      // Wait until this account's scheduled time
      const waitTime = account.offset - previousOffset
      if (waitTime > 0) {
        console.log(`⏳ Waiting ${(waitTime / 1000 / 60).toFixed(1)} minutes until next scheduled login...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
      previousOffset = account.offset

      console.log(`🔄 Processing: ${account.store_name} (scheduled at ${new Date(Date.now() + (account.offset - previousOffset)).toLocaleTimeString()})`)

      // Build password list: custom → primary → secondary
      const passwordsToTry: string[] = []
      if (account.customPassword) {
        passwordsToTry.push(account.customPassword)
      }
      passwordsToTry.push(primaryDefault)
      if (secondaryDefault && secondaryDefault !== primaryDefault) {
        passwordsToTry.push(secondaryDefault)
      }

      let loginSuccess = false
      let lastError = ''

      for (const pwd of passwordsToTry) {
        const label = pwd === account.customPassword ? 'custom' :
                      pwd === primaryDefault ? 'primary default' : 'secondary default'
        console.log(`   🔑 Trying ${label}`)
        try {
          const result = await automation.login(account.mobile_number, pwd)
          if (result.success) {
            loginSuccess = true
            console.log(`   ✅ Login SUCCESS with ${label}`)
            await updateAccountStatus(account.id, 'success', new Date())
            await createLoginLog(account.id, 'success')
            break
          } else {
            lastError = result.error || 'Login failed'
            console.log(`   ❌ Failed with ${label}: ${lastError}`)
          }
        } catch (err: any) {
          lastError = err.message
          console.error(`   ❌ Error with ${label}:`, err.message)
        }
      }

      if (!loginSuccess) {
        console.log(`   ❌ All passwords failed for ${account.store_name}`)
        await updateAccountStatus(account.id, 'needs_password_update', new Date())
        await createLoginLog(account.id, 'needs_password_update', lastError)
        hasError = true
      }

      // Small random delay between accounts (even if scheduled close)
      await LoginAutomation.delay(1000, 3000)
    }

    console.log(`🏁 All accounts processed in ${(previousOffset / 1000 / 60).toFixed(1)} minutes.`)

  } catch (error) {
    console.error('❌ Critical error during processing:', error)
    hasError = true
  } finally {
    await automation.cleanup()
    await markWorkflowRun(targetDay, hasError ? 'failed' : 'completed')
    console.log("🏁 Shutting down.")
    process.exit(0)
  }
}

processPendingTasks().catch(async (err) => {
  console.error(err)
  await markWorkflowRun(process.env.TARGET_DAY!, 'failed')
  process.exit(1)
})