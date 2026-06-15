import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Fallback responses when API fails
function getFallbackResponse(question: string, stats: any): string {
  const q = question.toLowerCase()
  
  if (q.includes('total') || q.includes('how many')) {
    return `📊 Currently, there are **${stats?.total || 0}** total accounts in the system.`
  }
  
  if (q.includes('success')) {
    return `✅ **${stats?.success || 0}** accounts have successful login status.`
  }
  
  if (q.includes('pending')) {
    return `⏳ **${stats?.pending || 0}** accounts are pending and waiting to be processed.`
  }
  
  if (q.includes('needs password') || q.includes('failed')) {
    return `🔑 **${stats?.needsPassword || 0}** accounts need password updates.`
  }
  
  if (q.includes('today') || q.includes('schedule')) {
    return `📅 Today's schedule has **${stats?.todayCount || 0}** accounts scheduled for login.`
  }
  
  return `I can help you with:
- Account statistics (total, success, pending, needs password)
- Today's schedule
- How to add/edit/delete accounts
- Automation schedules and manual triggers
- System settings and configuration

Try asking something like: "How many accounts are pending?" or "Show me today's schedule"`
}

async function getDatabaseStats() {
  try {
    const { data: accounts } = await supabase.from('accounts').select('*')
    
    if (!accounts || accounts.length === 0) {
      return null
    }
    
    const total = accounts.length
    const success = accounts.filter(a => a.status === 'success').length
    const pending = accounts.filter(a => a.status === 'pending').length
    const needsPassword = accounts.filter(a => a.status === 'needs_password_update').length
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const today = days[new Date().getDay()]
    const todayAccounts = accounts.filter(a => a.login_day === today)
    
    return {
      total,
      success,
      pending,
      needsPassword,
      todayCount: todayAccounts.length,
      todayAccounts: todayAccounts.slice(0, 5).map(a => ({ name: a.store_name, status: a.status })),
    }
  } catch (error) {
    console.error('Error getting stats:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const userMessage = messages[messages.length - 1]?.content || ''
    
    // Get real-time data from database
    const stats = await getDatabaseStats()
    
    // If no API key, use fallback responses
    if (!GROQ_API_KEY) {
      console.log('No GROQ_API_KEY found, using fallback responses')
      const reply = getFallbackResponse(userMessage, stats)
      return NextResponse.json({ reply })
    }
    
    let systemPrompt = `You are System Assistant for a Login Automation System. Keep responses concise and helpful.`

    if (stats) {
      systemPrompt += `

Current REAL DATA from database:
- Total Accounts: ${stats.total}
- Successful: ${stats.success}
- Pending: ${stats.pending}
- Needs Password: ${stats.needsPassword}
- Today's Schedule: ${stats.todayCount} accounts

${stats.todayAccounts.length > 0 ? `Today's scheduled accounts:\n${stats.todayAccounts.map(a => `- ${a.name} (${a.status})`).join('\n')}` : ''}

Answer questions based on this real data when relevant. Be helpful and concise.`
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Fast, free, good quality
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-5)
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    const data = await response.json()
    
    // Check if response has the expected structure
    if (!response.ok) {
      console.error('Groq API error:', data)
      const reply = getFallbackResponse(userMessage, stats)
      return NextResponse.json({ reply })
    }
    
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response from Groq:', data)
      const reply = getFallbackResponse(userMessage, stats)
      return NextResponse.json({ reply })
    }
    
    const reply = data.choices[0].message.content
    return NextResponse.json({ reply })
    
  } catch (error) {
    console.error('Chat API error:', error)
    // Return fallback response instead of error
    const stats = await getDatabaseStats()
    const reply = getFallbackResponse('help', stats)
    return NextResponse.json({ reply })
  }
}