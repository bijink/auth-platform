import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { OtpService } from 'src/otp/otp.service'
import { TokenService } from 'src/token/token.service'
import { CreateUserDto } from 'src/user/dto'
import { AuthService } from './auth.service'
import { Public, User } from './decorator'
import {
  ChangeEmailDto,
  ChangePasswordDto,
  EmailOtpDto,
  ForgotPasswordDto,
  LoginDto,
  VerifyOtpDto,
} from './dto'
import { RefreshTokenGuard } from './guard'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  @Public()
  // @UseInterceptors(AuditInterceptor)
  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto)
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  logoutAll(@User('sub') userId: number) {
    return this.authService.logoutFromAllDevices(userId)
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh-token')
  refreshToken(
    @User('sub') userId: number,
    @User('rtid') refreshTokenId: string,
  ) {
    return this.tokenService.refreshToken(userId, refreshTokenId)
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  @Post('revoke-refresh-token')
  revokeRefreshToken(@User('rtid') refreshTokenId: string) {
    return this.tokenService.revokeRefreshToken(refreshTokenId)
  }

  @ApiBearerAuth()
  // @UseInterceptors(AuditInterceptor)
  @Patch('change-email')
  changeEmail(
    @User('email') oldEmail: string,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    return this.authService.changeEmail(oldEmail, changeEmailDto)
  }

  @ApiBearerAuth()
  // @UseInterceptors(AuditInterceptor)
  @Patch('change-password')
  changePassword(
    @User('email') email: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(email, changePasswordDto)
  }

  @Public()
  // @UseInterceptors(AuditInterceptor)
  @Patch('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto)
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('email-otp')
  emailOtp(@Body() emailOtpDto: EmailOtpDto) {
    return this.otpService.emailOtp(emailOtpDto.email)
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('guarded-email-otp')
  guardedEmailOtp(@User('email') email: string) {
    return this.otpService.emailOtp(email, true)
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.otpService.verifyOtp(verifyOtpDto)
  }
}
