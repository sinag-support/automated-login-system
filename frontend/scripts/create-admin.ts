// scripts/create-admin.ts
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  const email = 'admin@example.com'
  const password = 'Admin123!'

  console.log(`Creating admin: ${email}`)

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    const admin = await prisma.admin.upsert({
      where: { email },
      update: { password: hashedPassword },
      create: { email, password: hashedPassword }
    })

    console.log('✅ Admin created successfully!')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: ${password}`)
  } catch (error: any) {
    console.error('❌ Failed to create admin:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()