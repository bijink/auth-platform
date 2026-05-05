import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from 'generated/prisma/client'
import { AlsService } from '../als/als.service'
import { AuditLogPrismaClient, auditLogExtension } from './extension'

@Injectable()
export class PrismaService extends PrismaClient {
  private _audit?: AuditLogPrismaClient

  constructor(
    config: ConfigService,
    private readonly als: AlsService,
  ) {
    const adapter = new PrismaPg({
      connectionString: config.get<string>('DATABASE_URL'),
    })
    super({ adapter })
  }

  get withAudit(): AuditLogPrismaClient {
    if (!this._audit) this._audit = auditLogExtension(this, this.als)
    return this._audit
  }

  cleanDb() {
    return this.$transaction([
      this.refreshToken.deleteMany(),
      this.user.deleteMany(),
    ])
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
