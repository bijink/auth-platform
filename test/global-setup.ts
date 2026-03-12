import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis'
import { execSync } from 'child_process'

declare global {
  var __PG_CONTAINER__: StartedPostgreSqlContainer
  var __REDIS_CONTAINER__: StartedRedisContainer
}

export default async () => {
  // eslint-disable-next-line no-console
  console.log('\n[Global Setup] Starting Testcontainers...')

  const [pgContainer, redisContainer] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine').withReuse().start(),
    new RedisContainer('redis:7-alpine').withReuse().start(),
  ])

  // Set environment variables for the test workers
  process.env.DATABASE_URL = pgContainer.getConnectionUri()
  process.env.REDIS_URL = redisContainer.getConnectionUrl()
  process.env.POSTGRES_USER = pgContainer.getUsername()
  process.env.POSTGRES_PASSWORD = pgContainer.getPassword()
  process.env.POSTGRES_DB = pgContainer.getDatabase()

  // Make the containers available globally so globalTeardown can stop them
  globalThis.__PG_CONTAINER__ = pgContainer
  globalThis.__REDIS_CONTAINER__ = redisContainer

  // eslint-disable-next-line no-console
  console.log(
    `[Global Setup] Postgres DB running on ${pgContainer.getConnectionUri()}`,
  )
  // eslint-disable-next-line no-console
  console.log(
    `[Global Setup] Redis running on ${redisContainer.getConnectionUrl()}`,
  )
  // eslint-disable-next-line no-console
  console.log('[Global Setup] Running Prisma Migrations...')
  execSync('npx prisma migrate deploy', { env: process.env, stdio: 'inherit' })
}
