import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const day = req.nextUrl.searchParams.get('day')
  if (!day) {
    return NextResponse.json({ error: 'Day parameter required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data, error } = await supabase
    .from('workflow_runs')
    .select('status, started_at')
    .eq('day', day)
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error checking workflow status:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ 
    isRunning: !!data,
    status: data?.status || null,
    startedAt: data?.started_at || null
  })
}