// app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const accounts = data.map((acc: any) => ({
      id: acc.id,
      mobileNumber: acc.mobile_number,
      storeName: acc.store_name,
      loginDay: acc.login_day,
      status: acc.status,
      lastLogin: acc.last_login,
      createdAt: acc.created_at,
      updatedAt: acc.updated_at
    }))

    return NextResponse.json(accounts)
  } catch (error: any) {
    console.error('API Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const { data: newAccount, error } = await supabase
      .from('accounts')
      .insert({
        mobile_number: data.mobileNumber,
        store_name: data.storeName,
        login_day: data.loginDay,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    const account = {
      id: newAccount.id,
      mobileNumber: newAccount.mobile_number,
      storeName: newAccount.store_name,
      loginDay: newAccount.login_day,
      status: newAccount.status,
      lastLogin: newAccount.last_login,
      createdAt: newAccount.created_at,
      updatedAt: newAccount.updated_at
    }

    return NextResponse.json(account, { status: 201 })
  } catch (error: any) {
    console.error('API Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}