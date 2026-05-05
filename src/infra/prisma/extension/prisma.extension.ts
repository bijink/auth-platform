import { PrismaClient, type Prisma } from 'generated/prisma/client'
import { AlsService } from 'src/infra/als/als.service'
import { getAuditContext } from '../util'

const auditLogType = {
  CREATE: 'CREATE',
  UPDATA: 'UPDATE',
  ERROR: 'ERROR',
}

export const auditLogExtension = (client: PrismaClient, als: AlsService) => {
  return client.$extends({
    query: {
      $allModels: {
        // CREATE
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
                type: auditLogType.CREATE,
                details: {
                  entity: model,
                  data: {
                    old: null,
                    new: newData,
                  },
                } as Prisma.InputJsonValue,
              },
            })

            return result
          })
        },
        // UPDATE
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
                type: auditLogType.UPDATA,
                details: {
                  entity: model,
                  data: {
                    old: oldData,
                    new: newData,
                  },
                } as Prisma.InputJsonValue,
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
