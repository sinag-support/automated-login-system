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

    // Build headers with proper types (ensure no undefined values)
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    }

    // Only add optional headers if they have values
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
        model: 'google/gemini-2.0-flash-lite-preview-02-05:free',
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