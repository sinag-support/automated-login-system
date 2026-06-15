import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Reset all accounts to 'pending'
    const { error, count } = await supabase
      .from('accounts')
      .update({ status: 'pending' })
      .neq('id', '00000000-0000-0000-0000-000000000000') // matches all rows

    if (error) {
      console.error('Reset error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All accounts have been reset to pending' 
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}