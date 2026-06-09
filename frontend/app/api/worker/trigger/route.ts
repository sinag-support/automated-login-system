import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { day } = await req.json()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Check if there's already a running workflow for this day
    const { data: existingRun, error: checkError } = await supabase
      .from('workflow_runs')
      .select('id')
      .eq('day', day)
      .eq('status', 'running')
      .single()

    if (existingRun) {
      return NextResponse.json(
        { error: `Automation for ${day} is already running. Please wait.` },
        { status: 409 }
      )
    }

    // Get accounts for this day that are NOT already 'success'
    const { data: accountsToUpdate, error: fetchError } = await supabase
      .from('accounts')
      .select('id, status')
      .eq('login_day', day)
      .neq('status', 'success')

    if (fetchError) throw fetchError

    if (!accountsToUpdate || accountsToUpdate.length === 0) {
      return NextResponse.json({ 
        message: `All accounts for ${day} are already successful. No action taken.`,
        skippedAll: true
      })
    }

    // Update those accounts to 'pending'
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ status: 'pending' })
      .in('id', accountsToUpdate.map(a => a.id))

    if (updateError) throw updateError

    // Insert a new workflow run record with status 'running'
    const { data: runRecord, error: insertError } = await supabase
      .from('workflow_runs')
      .insert({
        day,
        status: 'running',
        triggered_by: 'manual',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert workflow run:', insertError)
      // Continue anyway – the workflow will still run
    }

    // Trigger GitHub Action
    const githubResponse = await fetch(
      `https://api.github.com/repos/official-errol/automated-login-system/actions/workflows/daily-login.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { day }
        })
      }
    )

    if (!githubResponse.ok) {
      // If GitHub trigger fails, mark the run as failed
      if (runRecord) {
        await supabase
          .from('workflow_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', runRecord.id)
      }
      throw new Error('Failed to trigger GitHub Action')
    }

    return NextResponse.json({ 
      message: `${accountsToUpdate.length} accounts for ${day} set to pending. Workflow triggered.`,
      updatedCount: accountsToUpdate.length,
      runId: runRecord?.id
    })
  } catch (error: any) {
    console.error("Trigger API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}