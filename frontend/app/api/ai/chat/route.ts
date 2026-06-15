import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

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

    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not configured')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    // Get the last user message
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()
    
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 })
    }

    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser question: ${lastUserMessage.content}`
    
    const result = await model.generateContent(fullPrompt)
    const reply = result.response.text()

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}