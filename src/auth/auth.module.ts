import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { OtpModule } from 'src/otp/otp.module'
import { TokenModule } from 'src/token/token.module'
import { UserModule } from 'src/user/user.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthGuard, RolesGuard } from './guard'

@Module({
  imports: [UserModule, TokenModule, OtpModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
