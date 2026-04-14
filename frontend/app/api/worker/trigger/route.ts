import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { day } = body

    const workerUrl = process.env.WORKER_API_URL
    const apiKey = process.env.WORKER_API_KEY

    console.log('🚀 Triggering worker:', { workerUrl, day })

    if (!workerUrl || !apiKey) {
      console.error('❌ Worker configuration missing')
      return NextResponse.json(
        { error: 'Worker not configured' },
        { status: 500 }
      )
    }

    // Call the Railway worker
    const res = await fetch(`${workerUrl}/run-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ day })
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('❌ Worker error:', errorText)
      return NextResponse.json(
        { error: `Worker error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    console.log('✅ Worker response:', data)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('❌ Trigger error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger worker' },
      { status: 500 }
    )
  }
}