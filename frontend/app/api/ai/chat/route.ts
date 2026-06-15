import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function getSystemContext() {
  // Get real-time stats from database
  const { data: accounts } = await supabase.from('accounts').select('*')
  
  const stats = {
    total: accounts?.length || 0,
    success: accounts?.filter(a => a.status === 'success').length || 0,
    pending: accounts?.filter(a => a.status === 'pending').length || 0,
    needsPassword: accounts?.filter(a => a.status === 'needs_password_update').length || 0,
  }
  
  // Get accounts that need attention
  const needsAttention = accounts?.filter(a => a.status === 'needs_password_update') || []
  
  return `CURRENT SYSTEM STATUS:
- Total: ${stats.total} accounts
- Successful: ${stats.success}
- Pending: ${stats.pending}
- Needs password: ${stats.needsPassword}
- Accounts needing attention: ${needsAttention.map(a => a.store_name).join(', ') || 'none'}

You are an assistant for this Login Automation System. Answer based on this real data.`
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const systemContext = await getSystemContext()
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Free, fast, good quality
        messages: [
          { role: 'system', content: systemContext },
          ...messages.slice(-5)
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    const data = await response.json()
    const reply = data.choices[0]?.message?.content || 'Sorry, I could not process that.'

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}