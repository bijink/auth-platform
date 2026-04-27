import { Module } from '@nestjs/common'
import { OtpModule } from 'src/otp/otp.module'
import { TokenModule } from 'src/token/token.module'
import { UserCleanupService } from './user-cleanup.service'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [OtpModule, TokenModule],
  controllers: [UserController],
  providers: [UserService, UserCleanupService],
  exports: [UserService],
})
export class UserModule {}
