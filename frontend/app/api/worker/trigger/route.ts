import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { day } = await req.json()
    
    // 1. Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_KEY!
    )

    // 2. Update statuses in the database
    const { error } = await supabase
      .from('accounts')
      .update({ status: 'pending' })
      .eq('login_day', day)

    if (error) {
      console.error("Supabase update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 3. Trigger GitHub Action
    const githubResponse = await fetch(
      `https://api.github.com/repos/official-errol/automated-login-system/actions/workflows/daily-login.yml/dispatches`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({ ref: 'main' })
      }
    )

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      console.error("GitHub Trigger Error:", errorText)
      return NextResponse.json({ error: "Failed to trigger GitHub Action" }, { status: 500 })
    }

    return NextResponse.json({ message: `Accounts for ${day} set to pending and workflow triggered.` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}