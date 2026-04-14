// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // Hardcoded check for now - we'll fix Prisma later
    if (email === 'admin@example.com' && password === 'Admin123!') {
      const token = jwt.sign(
        { email },
        process.env.JWT_SECRET || 'dev-secret-key',
        { expiresIn: '7d' }
      )
      
      return NextResponse.json({ 
        token,
        user: { email }
      })
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}