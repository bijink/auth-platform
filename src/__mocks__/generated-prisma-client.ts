/**
 * Jest mock for generated Prisma client.
 * The real client uses ESM .js imports that Jest cannot resolve;
 * this mock is used so tests don't load the actual generated client.
 */
export class PrismaClientKnownRequestError extends Error {
  code?: string
  meta?: unknown
  constructor(message: string, options?: { code?: string; meta?: unknown }) {
    super(message)
    this.name = 'PrismaClientKnownRequestError'
    this.code = options?.code
    this.meta = options?.meta
  }
}

/** Minimal PrismaClient for tests (PrismaService extends this). */
export class PrismaClient {
  constructor(_options?: { adapter?: unknown }) {
    void _options
  }
}

export const Prisma = {
  PrismaClientKnownRequestError,
}
