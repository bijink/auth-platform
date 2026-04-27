import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/infra/prisma/prisma.service'

@Injectable()
export class UserCleanupService {
  constructor(private readonly prisma: PrismaService) {}

  // runs every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleUserCleanup() {
    const now = new Date()
    // 7-day grace period
    const threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const usersToDelete = await this.prisma.user.findMany({
      where: {
        deleted: true,
        deletedAt: {
          lte: threshold,
        },
      },
    })

    for (const user of usersToDelete) {
      // IMPORTANT: handle dependencies before delete

      await this.prisma.$transaction([
        this.prisma.user.delete({ where: { id: user.id } }),
      ])
    }
  }
}
