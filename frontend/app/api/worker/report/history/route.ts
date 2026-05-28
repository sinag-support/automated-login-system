import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const workerUrl = process.env.WORKER_API_URL
    const apiKey = process.env.WORKER_API_KEY

    if (!workerUrl || !apiKey) {
      return NextResponse.json({ error: 'Worker configuration missing' }, { status: 500 })
    }

    const res = await fetch(`${workerUrl}/report/history`, {
      headers: { 'x-api-key': apiKey },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}