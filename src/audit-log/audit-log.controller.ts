import { Controller, Get, Query } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { Role } from 'generated/prisma/enums'
import { Roles, User } from 'src/auth/decorator'
import { AuditLogService } from './audit-log.service'
import { GetAuditLogsQueryDto } from './dto'

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Get all audit logs' })
  @ApiOkResponse({ description: 'List of audit logs retrieved successfully' })
  @Get()
  getAuditLogs(
    @User('role') userRole: string,
    @Query() getAuditLogsQueryDto: GetAuditLogsQueryDto,
  ) {
    return this.auditLogService.findAllAuditLogs(userRole, getAuditLogsQueryDto)
  }
}
