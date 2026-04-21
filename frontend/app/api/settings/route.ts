import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
    
    if (error) throw error
    
    // Convert to key-value object
    const settings: Record<string, string> = {}
    data.forEach((item: any) => {
      settings[item.key] = item.value
    })
    
    return NextResponse.json(settings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const updates = await req.json()
    
    for (const [key, value] of Object.entries(updates)) {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key, 
          value: String(value),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
      
      if (error) throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}