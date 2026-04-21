import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json()
    
    // Get token from header
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string }
    
    // Get admin user
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', decoded.email)
      .single()
    
    if (error || !admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }
    
    // Check if password is hashed (bcrypt hash starts with $2a$ or $2b$)
    const isHashed = admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')
    
    let validPassword = false
    
    if (isHashed) {
      // Compare with bcrypt
      validPassword = await bcrypt.compare(currentPassword, admin.password)
    } else {
      // Plain text comparison (for existing admin)
      validPassword = currentPassword === admin.password
    }
    
    if (!validPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Update password (always store hashed)
    const { error: updateError } = await supabase
      .from('admins')
      .update({ password: hashedPassword })
      .eq('email', decoded.email)
    
    if (updateError) throw updateError
    
    return NextResponse.json({ success: true, message: 'Password changed successfully' })
  } catch (error: any) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}