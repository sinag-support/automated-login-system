import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { day } = await req.json()
    console.log("URL exists:", !!process.env.SUPABASE_URL);
console.log("KEY exists:", !!process.env.SUPABASE_SERVICE_KEY);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Missing Supabase environment variables!");
}
    // Initialize Supabase using the Service Role Key
    const supabase = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Update statuses directly in the database
    // This removes the need to call the external Render URL
    const { error } = await supabase
      .from('accounts')
      .update({ status: 'pending' })
      .eq('login_day', day)

    if (error) {
      console.error("Supabase update error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: `Accounts for ${day} set to pending.` })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}