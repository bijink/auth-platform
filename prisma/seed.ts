import { InternalServerErrorException } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import * as argon from 'argon2'
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaClient, Role } from '../generated/prisma/client'

if (!process.env.DATABASE_URL)
  throw new InternalServerErrorException('Missing env DATABASE_URL')
if (process.env.NODE_ENV === 'production' && !process.env.SUPER_ADMIN_EMAIL)
  throw new InternalServerErrorException('Missing env SUPER_ADMIN_EMAIL')
if (process.env.NODE_ENV === 'production' && !process.env.SUPER_ADMIN_PASSWORD)
  throw new InternalServerErrorException('Missing env SUPER_ADMIN_PASSWORD')

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

interface SeedUser {
  email: string
  password: string
  role: Role
}

const prodUsers: SeedUser[] = [
  {
    email: process.env.SUPER_ADMIN_EMAIL!,
    password: process.env.SUPER_ADMIN_PASSWORD!,
    role: 'SUPER_ADMIN',
  },
]
const devUsers: SeedUser[] = [
  {
    email: process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@authsystem.io',
    password: process.env.SUPER_ADMIN_PASSWORD ?? 'password123',
    role: 'SUPER_ADMIN',
  },
  { email: 'admin@authsystem.io', password: 'password123', role: 'ADMIN' },
  {
    email: 'moderator@authsystem.io',
    password: 'password123',
    role: 'MODERATOR',
  },
  { email: 'user@authsystem.io', password: 'password123', role: 'USER' },
]

async function main() {
  const users = process.env.NODE_ENV === 'production' ? prodUsers : devUsers

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        password: await argon.hash(user.password),
        role: user.role,
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
