import { PrismaClient } from 'generated/prisma/client'
import { AlsService } from '../als/als.service'

export const auditLogExtension = (client: PrismaClient, als: AlsService) => {
  return client.$extends({
    query: {
      $allModels: {
        async update({ model, args, query }) {
          if (model === 'AuditLog') return query(args)

          // const oldData = await (client as any)[model].findUnique({
          //   where: args.where,
          // })

          // Get the data from the ALS pocket!
          const store = als.getStore()
          const userIdValue: unknown = store?.get('userId')
          const userEmailValue: unknown = store?.get('userEmail')
          const ipValue: unknown = store?.get('ip')
          const urlValue: unknown = store?.get('url')

          const userId =
            typeof userIdValue === 'number' ? userIdValue : undefined
          const userEmail =
            typeof userEmailValue === 'string' ? userEmailValue : undefined
          const ipAddress = typeof ipValue === 'string' ? ipValue : undefined
          const url = typeof urlValue === 'string' ? urlValue : undefined

          return client.$transaction(async (tx) => {
            const result = await query(args)

            await tx.auditLog.create({
              data: {
                action: 'UPDATE',
                entity: model,
                entityId: JSON.stringify(args.where),
                // oldData,
                newData: result,
                userId,
                userEmail,
                ipAddress,
                url,
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
