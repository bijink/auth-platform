import { Prisma } from 'generated/prisma/client'

import type { ModelName } from 'generated/prisma/internal/prismaNamespace'

export interface PrismaDelegate<
  T,
  FindManyArgs = unknown,
  CountArgs = unknown,
> {
  findMany(args?: FindManyArgs): Promise<T[]>
  count(args?: CountArgs): Promise<number>
}

export type PrismaFindManyArgs<M extends ModelName> =
  Prisma.TypeMap['model'][M]['operations']['findMany']['args']
export type PrismaCountArgs<M extends ModelName> =
  Prisma.TypeMap['model'][M]['operations']['count']['args']

export type PaginationOptions<M extends ModelName> = Omit<
  PrismaFindManyArgs<M>,
  'skip' | 'take'
>
