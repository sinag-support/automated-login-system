import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const workerUrl = process.env.WORKER_API_URL
    const apiKey = process.env.WORKER_API_KEY

    if (!workerUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Worker configuration missing' },
        { status: 500 }
      )
    }

    const res = await fetch(`${workerUrl}/report/history`, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    // Check content-type to avoid parsing HTML as JSON
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      console.error('Worker returned non-JSON response:', contentType)
      return NextResponse.json([]) // Return empty array gracefully
    }

    const data = await res.json()
    return NextResponse.json(Array.isArray(data) ? data : [])
  } catch (error: any) {
    console.error('Failed to fetch report history:', error.message)
    // Return empty array instead of throwing
    return NextResponse.json([])
  }
}