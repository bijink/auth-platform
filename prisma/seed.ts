import { PrismaPg } from '@prisma/adapter-pg'
import * as argon from 'argon2'
import 'dotenv/config'
import { PrismaClient, Role } from 'generated/prisma/client'
import { Pool } from 'pg'

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const users = [
  { email: 'bob@prisma.io', role: 'SUPER_ADMIN' },
  { email: 'alice@prisma.io', role: 'ADMIN' },
  { email: 'varun@prisma.io', role: 'MODERATOR' },
  { email: 'john@prisma.io', role: 'USER' },
]

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        password: await argon.hash('password123'),
        role: user.role as Role,
      },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
