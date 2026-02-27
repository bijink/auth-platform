import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { CreateUserDto } from 'src/users/dto/create-user.dto'
import { AuthService } from './auth.service'
import { Public } from './decorator/public.decorator'
import { User } from './decorator/user.decorator'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenGuard } from './guard/refresh-token.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto)
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  logoutAll(@User('sub') userId: number) {
    return this.authService.logoutFromAllDevices(userId)
  }

  @Post('refresh-token')
  @Public()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  refreshToken(
    @User('sub') userId: number,
    @User('rtid') refreshTokenId: string,
  ) {
    return this.authService.refreshToken(userId, refreshTokenId)
  }

  @Post('revoke-refresh-token')
  @Public()
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  revokeRefreshToken(@User('rtid') refreshTokenId: string) {
    return this.authService.revokeRefreshToken(refreshTokenId)
  }
}
