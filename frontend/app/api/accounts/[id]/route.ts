// app/api/accounts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  console.log('=== DELETE /api/accounts/[id] ===')
  
  try {
    const { id } = await context.params
    console.log('Deleting account ID:', id)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Account deleted:', id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const data = await req.json()
    console.log('PUT /api/accounts/[id]:', id, data)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const updateData: any = {}
    if (data.loginDay) updateData.login_day = data.loginDay
    if (data.storeName) updateData.store_name = data.storeName
    if (data.customPassword) updateData.customPassword = data.customPassword
    if (data.status) updateData.status = data.status
    updateData.updated_at = new Date().toISOString()

    const { data: updated, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const account = {
      id: updated.id,
      mobileNumber: updated.mobile_number,
      storeName: updated.store_name,
      loginDay: updated.login_day,
      status: updated.status,
      lastLogin: updated.last_login,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    }

    return NextResponse.json(account)
  } catch (error: any) {
    console.error('PUT error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}