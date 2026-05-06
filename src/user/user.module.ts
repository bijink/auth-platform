import { Module } from '@nestjs/common'
import { PaginationModule } from 'src/common/pagination/pagination.module'
import { OtpModule } from 'src/otp/otp.module'
import { TokenModule } from 'src/token/token.module'
import { UserCleanupService } from './user-cleanup.service'
import { UserController } from './user.controller'
import { UserService } from './user.service'

@Module({
  imports: [OtpModule, TokenModule, PaginationModule],
  controllers: [UserController],
  providers: [UserService, UserCleanupService],
  exports: [UserService],
})
export class UserModule {}
