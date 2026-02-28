import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { CreateUserDto } from 'src/users/dto'
import { AuthService } from './auth.service'
import { Public, User } from './decorator'
import { EmailOtpDto, LoginDto, VerifyOtpDto } from './dto'
import { AuthGuard, RefreshTokenGuard } from './guard'
import { OtpService } from './service'

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

  @Post('email-otp')
  @HttpCode(HttpStatus.OK)
  emailOtp(@Body() emailOtpDto: EmailOtpDto) {
    return this.otpService.generate(emailOtpDto)
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.otpService.verify(verifyOtpDto)
  }

  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  logoutAll(@User('sub') userId: number) {
    return this.authService.logoutFromAllDevices(userId)
  }

  @Post('refresh-token')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  refreshToken(
    @User('sub') userId: number,
    @User('rtid') refreshTokenId: string,
  ) {
    return this.authService.refreshToken(userId, refreshTokenId)
  }

  @Post('revoke-refresh-token')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  revokeRefreshToken(@User('rtid') refreshTokenId: string) {
    return this.authService.revokeRefreshToken(refreshTokenId)
  }
}
