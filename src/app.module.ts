import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthInfrastructureModule } from './auth/auth-infrastructure.module'
import { AuthModule } from './auth/auth.module'
import envValidation from './config/env.validation'
import { PrismaModule } from './infra/prisma/prisma.module'
import { RedisModule } from './infra/redis/redis.module'
import { RedisService } from './infra/redis/redis.service'
import { UserModule } from './user/user.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: envValidation,
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    RedisModule,
    AuthInfrastructureModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService, ConfigService],
      useFactory: (redis: RedisService, config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL') as number,
            limit: config.get('THROTTLE_LIMIT') as number,
          },
        ],
        storage: new ThrottlerStorageRedisService(redis),
      }),
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
