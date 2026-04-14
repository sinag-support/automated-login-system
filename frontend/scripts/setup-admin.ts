import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set')
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const admin = await prisma.admin.upsert({
      where: { email },
      update: { password: hashedPassword },
      create: { email, password: hashedPassword }
    })

    console.log('Admin created/updated:', admin.email)
  } catch (error) {
    console.error('Failed to create admin:', error)
  }
}

createAdmin()