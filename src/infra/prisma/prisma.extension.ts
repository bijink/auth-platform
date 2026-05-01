import { PrismaClient, type Prisma } from 'generated/prisma/client'
import { AlsService } from '../als/als.service'

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
        async update({ model, args, query }) {
          if (model === 'AuditLog') return query(args)

          // Get the data from the ALS pocket
          const store = als.getStore()
          const userId = store?.get('userId') as unknown as number | undefined
          const userEmail = store?.get('userEmail') as unknown as
            | string
            | undefined
          const ipAddress = store?.get('ip') as unknown as string | undefined
          const url = store?.get('url') as unknown as string | undefined
          const method = store?.get('method') as unknown as string | undefined

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
              where: args.where,
            })

            await tx.auditLog.create({
              data: {
                userId,
                userEmail,
                ipAddress,
                url,
                method,
                action: `${model.toUpperCase()}_${action.UPDATA}`,
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
