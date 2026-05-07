import { PrismaClient, type Prisma } from 'generated/prisma/client'
import { auditLogType } from 'src/audit-log/constant'
import { AlsService } from 'src/infra/als/als.service'

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

function getAuditContext(als: AlsService) {
  const store = als.getStore()

  return {
    requestUrl: store?.get('url') as string | undefined,
    requestMethod: store?.get('method') as string | undefined,
    userId: store?.get('userId') as number | undefined,
    userEmail: store?.get('userEmail') as string | undefined,
    userIpAddress: store?.get('ip') as string | undefined,
  }
}
