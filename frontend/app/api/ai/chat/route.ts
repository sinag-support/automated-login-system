import { NextRequest, NextResponse } from 'next/server'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const SITE_NAME = 'Login Automation System'

const SYSTEM_PROMPT = `You are an AI assistant specialized in the Login Automation System. Keep responses short and practical.

Key facts about this system:
- Automates daily logins for store accounts on https://ph.pmiandu.com
- Uses GitHub Actions (schedule: Mon-Sat 8am UTC, plus manual triggers)
- Account statuses: 'pending', 'success', 'needs_password_update'
- All accounts reset to 'pending' every Sunday
- Pages: Dashboard (overview), Accounts (CRUD), Schedule (day view + manual run), Reports (weekly stats), Settings (config)
- Automation settings: delay between logins (ms), max retries, auto-retry

Answer questions concisely. Focus on practical help for using this system.`

// Free models available on OpenRouter
const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-flash-1.5-8b',
  'microsoft/phi-3-mini-128k-instruct:free',
  'qwen/qwen-2.5-3b-instruct:free',
  'mistralai/mistral-7b-instruct:free'
]

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!OPENROUTER_API_KEY) {
      console.error('OpenRouter API key not configured')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    }

    if (SITE_URL) {
      headers['HTTP-Referer'] = SITE_URL
    }
    if (SITE_NAME) {
      headers['X-Title'] = SITE_NAME
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        // Use a confirmed working free model
        model: 'google/gemini-flash-1.5-8b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-10)
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OpenRouter error:', data)
      
      // Fallback to another free model if this one fails
      if (data.error?.message?.includes('model')) {
        const fallbackResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'microsoft/phi-3-mini-128k-instruct:free',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages.slice(-10)
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        })
        
        const fallbackData = await fallbackResponse.json()
        
        if (fallbackResponse.ok) {
          const reply = fallbackData.choices[0]?.message?.content || 'Sorry, I could not process that.'
          return NextResponse.json({ reply })
        }
      }
      
      return NextResponse.json(
        { error: data.error?.message || 'AI service error' },
        { status: response.status }
      )
    }

    const reply = data.choices[0]?.message?.content || 'Sorry, I could not process that.'
    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}