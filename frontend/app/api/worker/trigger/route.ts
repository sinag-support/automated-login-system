import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { day } = await req.json()
    
    // 1. Initialize Supabase (using service role key for updates)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_KEY!
    )

    // 2. Get accounts for the given day that are NOT already 'success'
    const { data: accountsToUpdate, error: fetchError } = await supabase
      .from('accounts')
      .select('id, status')
      .eq('login_day', day)
      .neq('status', 'success')   // only pending or needs_password_update

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!accountsToUpdate || accountsToUpdate.length === 0) {
      // Nothing to process
      return NextResponse.json({ 
        message: `All accounts for ${day} are already successful. No action taken.`,
        skippedAll: true
      })
    }

    // 3. Update only those accounts to 'pending'
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ status: 'pending' })
      .in('id', accountsToUpdate.map(a => a.id))

    if (updateError) {
      console.error("Supabase update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 4. Trigger GitHub Action (only if there were accounts to process)
    const githubResponse = await fetch(
      `https://api.github.com/repos/official-errol/automated-login-system/actions/workflows/daily-login.yml/dispatches`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({ ref: 'main', inputs: { day } })
      }
    )

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      console.error("GitHub Trigger Error:", errorText)
      return NextResponse.json({ error: "Failed to trigger GitHub Action" }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${accountsToUpdate.length} accounts for ${day} set to pending. Workflow triggered.`,
      updatedCount: accountsToUpdate.length
    })
  } catch (error: any) {
    console.error("Trigger API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}