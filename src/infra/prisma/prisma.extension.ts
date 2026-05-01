import { PrismaClient, type Prisma } from 'generated/prisma/client'
import { AlsService } from '../als/als.service'
import { getAuditContext } from './audit.helper'

type PrismaJsonValue =
  | Prisma.InputJsonValue
  | Prisma.NullableJsonNullValueInput
  | undefined

const action = {
  CREATE: 'CREATE',
  UPDATA: 'UPDATE',
  DELETE: 'DELETE',
}

export const auditLogExtension = (client: PrismaClient, als: AlsService) => {
  return client.$extends({
    query: {
      $allModels: {
        // create
        async create({ model, args, query }) {
          if (model === 'AuditLog') return query(args)

          // Get the data from the ALS pocket
          const context = getAuditContext(als)

          return client.$transaction(async (tx) => {
            const txModels = tx as unknown as Record<
              string,
              { findUnique?: (params: { where: unknown }) => Promise<unknown> }
            >

            const result = await query(args)

            const newData = await txModels[model]?.findUnique?.({
              where: { id: result.id },
            })

            await tx.auditLog.create({
              data: {
                ...context,
                action: action.CREATE,
                entity: model,
                oldData: undefined,
                newData: newData as PrismaJsonValue,
              },
            })

            return result
          })
        },
        // update
        async update({ model, args, query }) {
          if (model === 'AuditLog') return query(args)

          // Get the data from the ALS pocket
          const context = getAuditContext(als)

          return client.$transaction(async (tx) => {
            const txModels = tx as unknown as Record<
              string,
              { findUnique?: (params: { where: unknown }) => Promise<unknown> }
            >

            const oldData = await txModels[model]?.findUnique?.({
              where: args.where,
            })

            const result = await query(args)

            const newData = await txModels[model]?.findUnique?.({
              where: { id: result.id },
            })
            await tx.auditLog.create({
              data: {
                ...context,
                action: action.UPDATA,
                entity: model,
                oldData: oldData as PrismaJsonValue,
                newData: newData as PrismaJsonValue,
              },
            })

            return result
          })
        },
      },
    },
  })
}

export type AuditLogPrismaClient = ReturnType<typeof auditLogExtension>
