import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
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
  @ApiOperation({ summary: 'Sign up new user' })
  @ApiCreatedResponse({ description: 'User signed up successfully' })
  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto)
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiOkResponse({ description: 'User logged in successfully' })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiOkResponse({
    description: 'User logged out successfully from all devices',
  })
  @Post('logout-all')
  logoutAll(@User('sub') userId: number) {
    return this.authService.logoutFromAllDevices(userId)
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({ description: 'Access token refreshed successfully' })
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
  @ApiOperation({ summary: 'Revoke refresh token' })
  @ApiOkResponse({ description: 'Refresh token revoked successfully' })
  @Post('revoke-refresh-token')
  revokeRefreshToken(@User('rtid') refreshTokenId: string) {
    return this.tokenService.revokeRefreshToken(refreshTokenId)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user email' })
  @ApiOkResponse({ description: 'Email changed successfully' })
  @Patch('change-email')
  changeEmail(
    @User('email') oldEmail: string,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    return this.authService.changeEmail(oldEmail, changeEmailDto)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @Patch('change-password')
  changePassword(
    @User('email') email: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(email, changePasswordDto)
  }

  @Public()
  @ApiOperation({ summary: 'Forgot password' })
  @ApiOkResponse({ description: 'Password reset code sent to email' })
  @Patch('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto)
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to email' })
  @ApiOkResponse({ description: 'OTP sent to email successfully' })
  @Post('email-otp')
  emailOtp(@Body() emailOtpDto: EmailOtpDto) {
    return this.otpService.emailOtp(emailOtpDto.email)
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to authenticated user email' })
  @ApiOkResponse({ description: 'OTP sent successfully' })
  @Post('guarded-email-otp')
  guardedEmailOtp(@User('email') email: string) {
    return this.otpService.emailOtp(email, true)
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiOkResponse({ description: 'OTP verified successfully' })
  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.otpService.verifyOtp(verifyOtpDto)
  }
}
