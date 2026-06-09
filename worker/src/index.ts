import 'dotenv/config'
import { LoginAutomation } from './automation'
import { updateAccountStatus, getAccountsByStatusAndDay } from './db'

async function processPendingTasks() {
  const targetDay = process.env.TARGET_DAY

  if (!targetDay) {
    console.error("❌ TARGET_DAY environment variable not set. Exiting.")
    process.exit(1)
  }

  console.log(`🎯 Processing accounts for: ${targetDay}`)

  // Fetch pending accounts only for the specified day
  const pendingAccounts = await getAccountsByStatusAndDay('pending', targetDay)

  if (!pendingAccounts || pendingAccounts.length === 0) {
    console.log(`✅ No pending accounts for ${targetDay}. Exiting.`)
    process.exit(0)
  }

  console.log(`📋 Found ${pendingAccounts.length} accounts to process.`)

  const automation = new LoginAutomation()
  await automation.initialize()

  try {
    for (const account of pendingAccounts) {
      await LoginAutomation.delay(3000, 7000)
      console.log(`🔄 Processing: ${account.store_name}`)

      try {
        const password = account.customPassword || account.defaultPassword
        const result = await automation.login(account.mobile_number, password)

        // Use 'needs_password_update' on failure, not 'failed'
        const status = result.success ? 'success' : 'needs_password_update'
        await updateAccountStatus(account.id, status, new Date())

        console.log(`   ${result.success ? '✅ Success' : '❌ Failed (needs password update)'}`)
      } catch (err: any) {
        console.error(`   ❌ Error processing ${account.store_name}:`, err.message)
        await updateAccountStatus(account.id, 'needs_password_update', new Date())
      }
    }
  } catch (error) {
    console.error('❌ Critical error during processing:', error)
  } finally {
    await automation.cleanup()
    console.log("🏁 All tasks processed. Shutting down.")
    process.exit(0)
  }
}

processPendingTasks().catch((err) => {
  console.error(err)
  process.exit(1)
})