import 'dotenv/config'
import { LoginAutomation } from './automation'
import { updateAccountStatus, createLoginLog, getAccountsByStatus } from './db' // Ensure you have getAccountsByStatus

async function processPendingTasks() {
  console.log("🚀 Starting queued task processor...");

  // 1. Fetch pending accounts directly from DB
  // Note: Ensure this function exists in your db.ts
  const pendingAccounts = await getAccountsByStatus('pending');

  if (!pendingAccounts || pendingAccounts.length === 0) {
    console.log("✅ No pending tasks found. Exiting.");
    process.exit(0);
  }

  console.log(`📋 Found ${pendingAccounts.length} accounts to process.`);

  const automation = new LoginAutomation();
  await automation.initialize();

  try {
    for (const account of pendingAccounts) {
      await LoginAutomation.delay(3000, 7000);
      console.log(`🔄 Processing: ${account.store_name}`);
      
      try {
        const password = account.customPassword || account.defaultPassword;
        const result = await automation.login(account.mobile_number, password);
        
        const status = result.success ? 'success' : 'failed';
        await updateAccountStatus(account.id, status);
        await createLoginLog(account.id, status, result.error);
        
        console.log(`   ${result.success ? '✅ Success' : '❌ Failed'}`);
      } catch (err: any) {
        console.error(`   ❌ Error processing ${account.store_name}:`, err.message);
        await updateAccountStatus(account.id, 'failed');
      }
    }
  } catch (error) {
    console.error('❌ Critical error during processing:', error);
  } finally {
    await automation.cleanup();
    console.log("🏁 All tasks processed. Shutting down.");
    process.exit(0);
  }
}

// Just run it!
processPendingTasks().catch((err) => {
  console.error(err);
  process.exit(1);
});