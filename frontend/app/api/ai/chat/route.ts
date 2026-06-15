import { NextRequest, NextResponse } from 'next/server'

// Intelligent keyword matching for your Login Automation System
function getAIResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase()
  
  // Account Management
  if (msg.includes('add account') || msg.includes('create account') || (msg.includes('new') && msg.includes('account'))) {
    return `📝 **How to add an account:**
1. Go to the **Accounts** page
2. Click the **Add Account** button
3. Enter mobile number (format: 639XXXXXXXXX)
4. Enter store name
5. Select a login day (Monday-Saturday or Unscheduled)
6. Click **Add Account**

The account will be created with status "Pending" and will be processed on its scheduled day.`
  }
  
  if (msg.includes('edit account') || msg.includes('update account')) {
    return `✏️ **How to edit an account:**
1. Go to the **Accounts** page
2. Find the account in the table
3. Click the **three dots** menu on the right
4. Select **Edit**
5. Update store name, login day, or status
6. Click **Save Changes**

Note: Mobile numbers cannot be changed. Delete and recreate if needed.`
  }
  
  if (msg.includes('delete account') || msg.includes('remove account')) {
    return `🗑️ **How to delete an account:**
1. Go to the **Accounts** page
2. Find the account in the table
3. Click the **three dots** menu
4. Select **Delete**
5. Confirm the deletion

⚠️ This action cannot be undone.`
  }
  
  if (msg.includes('reset') && (msg.includes('all') || msg.includes('pending'))) {
    return `🔄 **Reset All Accounts to Pending:**
- Click **"Reset All to Pending"** button on the Accounts page
- Confirm the action in the dialog
- All accounts (including successful ones) will be set to "Pending"
- Next automation run will reprocess all accounts

📅 **Automatic reset:** Every Sunday at 00:00 UTC, all accounts reset to pending automatically.`
  }
  
  // Schedule & Automation
  if (msg.includes('run automation') || msg.includes('trigger') || (msg.includes('manual') && msg.includes('run'))) {
    return `⚙️ **Manual Automation Trigger:**
1. Go to the **Schedule** page
2. Select the day you want to run (Monday-Saturday)
3. Click **"Run {Day} Automation"**
4. The system will only process accounts that are NOT already successful

⏰ **Scheduled runs:** Automation runs automatically at 8:00 AM UTC, Monday-Saturday.`
  }
  
  if (msg.includes('schedule') || msg.includes('what day') || msg.includes('when')) {
    return `📅 **Login Schedule:**
- **Monday to Saturday** - Automation runs daily at 8:00 AM UTC
- **Sunday** - No automation (all accounts reset to pending)
- Accounts are processed based on their assigned **login_day**
- You can view and manage schedules on the **Schedule** page`
  }
  
  if (msg.includes('pending') && !msg.includes('reset')) {
    return `⏳ **Pending Status:**
- Account is waiting to be processed
- Will be processed on its scheduled login day
- After processing, status changes to "Success" or "Needs Password"
- You can manually reset accounts to pending using the reset button`
  }
  
  if (msg.includes('success') || (msg.includes('successful') && msg.includes('login'))) {
    return `✅ **Success Status:**
- Login was successful
- Account will NOT be reprocessed until manually reset or Sunday reset
- Last login timestamp is recorded
- View successful logins on Dashboard and Reports page`
  }
  
  if (msg.includes('needs password') || (msg.includes('failed') && msg.includes('login'))) {
    return `🔑 **Needs Password Status:**
- Login attempt failed (likely wrong password)
- Update the password for this account
- After updating, manually trigger automation or wait for next scheduled run
- The system will retry automatically`
  }
  
  // Reports & Dashboard
  if (msg.includes('dashboard')) {
    return `📊 **Dashboard Overview:**
- **Total accounts** - All accounts in the system
- **Successful** - Accounts marked as success
- **Needs Password** - Accounts with failed logins
- **Pending** - Accounts waiting to be processed
- **Recent Activity** - Last 5 login attempts
- **Today's Schedule** - Accounts scheduled for today`
  }
  
  if (msg.includes('report') || msg.includes('weekly') || msg.includes('statistics')) {
    return `📈 **Reports Page Features:**
- **Overview tab** - Complete list of all accounts with current status
- **By Day tab** - Breakdown of totals, successes, and needs password by day
- **Weekly Progress** - Overall completion percentage
- **Export CSV** - Download report as CSV file

All data reflects current status from the database.`
  }
  
  // Settings
  if (msg.includes('settings') || msg.includes('configure') || msg.includes('delay') || msg.includes('retry')) {
    return `⚙️ **Settings Configuration:**
- **Delay Between Logins** - Time between each login attempt (1000-10000ms)
- **Max Retries** - Number of retry attempts (1-3)
- **Auto Retry** - Automatically retry failed logins

🔧 **Security:**
- **Change Admin Password** - Update your login password
- **Default Password** - Default password for new accounts`
  }
  
  // General help
  if (msg.includes('help') || msg.includes('what can you do') || msg.includes('how to use')) {
    return `🤖 **I can help you with:**

📋 **Accounts**
- Adding, editing, deleting accounts
- Resetting all accounts to pending
- Understanding account statuses

📅 **Schedule**
- Viewing daily schedules
- Manually triggering automation
- Understanding when automation runs

📊 **Reports**
- Viewing weekly statistics
- Checking account statuses
- Exporting data to CSV

⚙️ **Settings**
- Configuring automation behavior
- Changing passwords

Just ask me anything about these topics!`
  }
  
  // Unknown questions
  return `❓ I'm not sure about that. Try asking about:
- Adding or editing accounts
- Running automation
- Account statuses (Pending, Success, Needs Password)
- Dashboard and Reports
- Settings configuration
- Resetting accounts

Or type "help" to see all topics I can assist with.`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    
    // Get the last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()
    
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }
    
    // Generate response using keyword matching (instant, no API limits)
    const reply = getAIResponse(lastUserMessage.content)
    
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}