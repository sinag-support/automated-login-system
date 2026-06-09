import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Check if there's any workflow with status 'running'
  const { data, error } = await supabase
    .from('workflow_runs')
    .select('id, day, started_at')
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error checking global workflow status:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({
    isRunning: !!data,
    runningDay: data?.day || null,
    startedAt: data?.started_at || null
  })
}