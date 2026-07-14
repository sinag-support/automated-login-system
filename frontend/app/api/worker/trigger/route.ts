import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { day } = await req.json()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Check for existing running workflow
    const { data: existingRun } = await supabase
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

    // Get accounts to update
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

    // Set them to pending
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ status: 'pending' })
      .in('id', accountsToUpdate.map(a => a.id))

    if (updateError) throw updateError

    // Insert workflow run record
    const { data: runRecord } = await supabase
      .from('workflow_runs')
      .insert({
        day,
        status: 'running',
        triggered_by: 'manual',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    // Trigger GitHub Action
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      console.error('GITHUB_TOKEN not set in environment')
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 })
    }

    const githubResponse = await fetch(
      `https://api.github.com/repos/official-errol/automated-login-system/actions/workflows/daily-login.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { day, is_manual: 'true' }
        })
      }
    )

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      console.error('GitHub API Error:', githubResponse.status, githubResponse.statusText, errorText)
      
      // Mark the workflow run as failed
      if (runRecord) {
        await supabase
          .from('workflow_runs')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', runRecord.id)
      }

      return NextResponse.json(
        { error: `GitHub API error: ${githubResponse.status} ${githubResponse.statusText}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      message: `${accountsToUpdate.length} accounts for ${day} set to pending. Workflow triggered.`,
      updatedCount: accountsToUpdate.length,
      runId: runRecord?.id
    })
  } catch (error: any) {
    console.error('Trigger API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}