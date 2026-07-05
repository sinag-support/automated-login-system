import 'dotenv/config'
import { LoginAutomation } from './automation'
import { updateAccountStatus, createLoginLog, getAccountsByStatusAndDay, supabase, getSettings } from './db'

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

  // 1. Fetch settings once
  const settings = await getSettings()
  const primaryDefault = settings.default_password || 'Batangas01'
  const secondaryDefault = settings.default_password_secondary || 'Appwards2025'
  console.log(`🔑 Default passwords: primary='${primaryDefault}', secondary='${secondaryDefault}'`)

  // 2. Get pending accounts for this day
  const pendingAccounts = await getAccountsByStatusAndDay('pending', targetDay)

  if (pendingAccounts.length === 0) {
    console.log(`✅ No pending accounts for ${targetDay}. Exiting.`)
    await markWorkflowRun(targetDay, 'completed')
    process.exit(0)
  }

  console.log(`📋 Found ${pendingAccounts.length} accounts to process.`)

  const automation = new LoginAutomation()
  let hasError = false

  try {
    await automation.initialize()

    for (const account of pendingAccounts) {
      await LoginAutomation.delay(3000, 7000)
      console.log(`🔄 Processing: ${account.store_name}`)

      // Build password list: custom → primary default → secondary default
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
    }
  } catch (error) {
    console.error('❌ Critical error during processing:', error)
    hasError = true
  } finally {
    await automation.cleanup()
    await markWorkflowRun(targetDay, hasError ? 'failed' : 'completed')
    console.log("🏁 All tasks processed. Shutting down.")
    process.exit(0)
  }
}

processPendingTasks().catch(async (err) => {
  console.error(err)
  await markWorkflowRun(process.env.TARGET_DAY!, 'failed')
  process.exit(1)
})