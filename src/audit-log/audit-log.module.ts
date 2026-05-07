import { Module } from '@nestjs/common'
import { PaginationModule } from 'src/common/pagination/pagination.module'
import { AuditLogController } from './audit-log.controller'
import { AuditLogService } from './audit-log.service'

@Module({
  imports: [PaginationModule],
  controllers: [AuditLogController],
  providers: [AuditLogService],
})
export class AuditLogModule {}
