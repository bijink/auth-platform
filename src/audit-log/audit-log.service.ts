import { Injectable } from '@nestjs/common'
import { PaginationProvider } from 'src/common/pagination/pagination.provider'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import { GetAuditLogsQueryDto } from './dto'

@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationProvider: PaginationProvider,
  ) {}

  public async findAllAuditLogs(
    userRole: string,
    getAuditLogsQueryDto: GetAuditLogsQueryDto,
  ) {
    // order query
    const orderByField = getAuditLogsQueryDto.orderBy
    const orderDirection = getAuditLogsQueryDto.order === 'asc' ? 'asc' : 'desc'
    // date query
    const { monthStart, monthEnd } = this.getDateFallbacks()
    const fromDate = new Date(getAuditLogsQueryDto.from ?? monthStart)
    const toDate = new Date(getAuditLogsQueryDto.to ?? monthEnd)
    toDate.setDate(toDate.getDate() + 1)

    return await this.paginationProvider.paginateQuery(
      this.prisma.auditLog,
      getAuditLogsQueryDto,
      {
        where: {
          createdAt: {
            gte: fromDate,
            lt: toDate,
          },
          type: {
            not: userRole === 'ADMIN' ? 'ERROR' : undefined,
            contains: getAuditLogsQueryDto.type ?? undefined,
          },
          ...(getAuditLogsQueryDto.userId && {
            userId: getAuditLogsQueryDto.userId,
          }),
          ...(getAuditLogsQueryDto.userEmail && {
            userEmail: {
              equals: getAuditLogsQueryDto.userEmail,
              mode: 'insensitive',
            },
          }),
        },
        orderBy: {
          [orderByField!]: orderByField ? orderDirection : undefined,
        },
      },
    )
  }

  private getDateFallbacks() {
    const now = new Date()
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    )
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
    )

    return { monthStart, monthEnd }
  }
}
