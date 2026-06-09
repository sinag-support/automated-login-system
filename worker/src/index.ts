import 'dotenv/config'
import { LoginAutomation } from './automation'
import { updateAccountStatus, createLoginLog, getAccountsByStatusAndDay, supabase } from './db'

async function markWorkflowRun(day: string, status: 'completed' | 'failed') {
  // Update the most recent running run for this day
  const { error } = await supabase
    .from('workflow_runs')
    .update({ 
      status, 
      completed_at: new Date().toISOString() 
    })
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

      try {
        const password = account.customPassword || account.defaultPassword
        const result = await automation.login(account.mobile_number, password)

        const status = result.success ? 'success' : 'needs_password_update'
        await updateAccountStatus(account.id, status, new Date())
        await createLoginLog(account.id, status, result.error)

        console.log(`   ${result.success ? '✅ Success' : '❌ Failed (needs password update)'}`)
      } catch (err: any) {
        console.error(`   ❌ Error processing ${account.store_name}:`, err.message)
        await updateAccountStatus(account.id, 'needs_password_update', new Date())
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