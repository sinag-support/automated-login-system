import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { day } = await req.json()
    if (!day) {
      return NextResponse.json({ error: 'Day is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Update the most recent running workflow for this day to 'failed'
    const { data, error } = await supabase
      .from('workflow_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('day', day)
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
      .select()

    if (error) {
      console.error('Force stop error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No running workflow found for this day' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: `Workflow for ${day} stopped` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}