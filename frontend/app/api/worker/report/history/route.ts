import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const workerUrl = process.env.WORKER_API_URL;
  const apiKey = process.env.WORKER_API_KEY;
  if (!workerUrl || !apiKey) return NextResponse.json({ error: 'Worker not configured' }, { status: 500 });

  const res = await fetch(`${workerUrl}/report/history`, {
    headers: { 'x-api-key': apiKey }
  });
  const data = await res.json();
  return NextResponse.json(data);
}