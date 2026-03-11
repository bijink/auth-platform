import { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { StartedRedisContainer } from '@testcontainers/redis'

declare global {
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined
  var __REDIS_CONTAINER__: StartedRedisContainer | undefined
}

export default async () => {
  // eslint-disable-next-line no-console
  console.log('\n[Global Teardown] Stopping Testcontainers...')

  const pgContainer = globalThis.__PG_CONTAINER__
  if (pgContainer) await pgContainer.stop()

  const redisContainer = globalThis.__REDIS_CONTAINER__
  if (redisContainer) await redisContainer.stop()

  // eslint-disable-next-line no-console
  console.log('[Global Teardown] Done.')
}
