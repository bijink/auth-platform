import { Controller, Get, Query } from '@nestjs/common'
import { Role } from 'generated/prisma/enums'
import { Roles, User } from 'src/auth/decorator'
import { AuditLogService } from './audit-log.service'
import { GetAuditLogsQueryDto } from './dto'

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get()
  getAuditLogs(
    @User('role') userRole: string,
    @Query() getAuditLogsQueryDto: GetAuditLogsQueryDto,
  ) {
    return this.auditLogService.findAllAuditLogs(userRole, getAuditLogsQueryDto)
  }
}
