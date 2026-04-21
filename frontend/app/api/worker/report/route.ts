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

    const response = await fetch(`${workerUrl}/report/weekly`, {
      headers: { 'x-api-key': apiKey }
    })

    if (!response.ok) {
      // If worker doesn't have report endpoint yet, return mock data
      return NextResponse.json({
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0,
        byDay: {},
        generatedAt: new Date().toISOString()
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    )
  }
}