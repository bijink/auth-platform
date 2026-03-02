import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { CreateUserDto } from 'src/user/dto'
import { AuthService } from './auth.service'
import { User } from './decorator'
import {
  ChangeEmailDto,
  ChangePasswordDto,
  EmailOtpDto,
  ForgotPasswordDto,
  LoginDto,
  VerifyOtpDto,
} from './dto'
import { AuthGuard, RefreshTokenGuard } from './guard'
import { OtpService } from './service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
  ) {}

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

  @Patch('change-email')
  @UseGuards(AuthGuard)
  changeEmail(
    @User('email') oldEmail: string,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    return this.authService.changeEmail(oldEmail, changeEmailDto)
  }

  @Patch('change-password')
  @UseGuards(AuthGuard)
  changePassword(
    @User('email') email: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(email, changePasswordDto)
  }

  @Patch('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto)
  }

  @Post('email-otp')
  @HttpCode(HttpStatus.OK)
  emailOtp(@Body() emailOtpDto: EmailOtpDto) {
    return this.otpService.emailOtp(emailOtpDto.email)
  }

  @Post('guarded-email-otp')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  guardedEmailOtp(@User('email') email: string) {
    return this.otpService.emailOtp(email, true)
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.otpService.verifyOtp(verifyOtpDto)
  }
}
