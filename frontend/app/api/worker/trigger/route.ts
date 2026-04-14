// app/api/worker/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('📡 POST /api/worker/trigger called')
  
  try {
    const body = await req.json()
    const { day } = body

    const workerUrl = process.env.WORKER_API_URL
    const apiKey = process.env.WORKER_API_KEY

    console.log('Worker URL:', workerUrl)
    console.log('Day:', day)

    if (!workerUrl || !apiKey) {
      console.error('Missing worker configuration')
      return NextResponse.json(
        { error: 'Worker configuration missing' },
        { status: 500 }
      )
    }

    const response = await fetch(`${workerUrl}/run-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({ day })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Worker error:', response.status, errorText)
      return NextResponse.json(
        { error: `Worker error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Trigger error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Optional: Add OPTIONS handler for CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}