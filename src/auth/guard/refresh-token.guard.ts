import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { JsonWebTokenError, JwtService } from '@nestjs/jwt'
import * as argon from 'argon2'
import { Request } from 'express'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import authConfig from '../config/auth.config'
import { ActiveUser, JwtRefreshPayload } from '../interface'
import { extractTokenFromHeader } from '../util'
import { REQUEST_USER_KEY } from './auth.guard'

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest()
    const token = extractTokenFromHeader(request)
    if (!token) throw new UnauthorizedException('Token missing')

    try {
      // verify jwt token
      const payload: JwtRefreshPayload = await this.jwtService.verifyAsync(
        token,
        { secret: this.authConfiguration.refreshSecret },
      )
      // find refreshToken saved in db
      const refreshTokenData = await this.prisma.refreshToken.findUnique({
        where: { id: payload.rtid },
      })
      if (!refreshTokenData) throw new UnauthorizedException('Token revoked')
      // verify refresh token with refresh token saved in db
      const rtMatches = await argon.verify(refreshTokenData.token, token)
      if (!rtMatches) throw new UnauthorizedException('Token unverified')

      request[REQUEST_USER_KEY] = {
        sub: payload.sub,
        rtid: refreshTokenData.id,
      } as ActiveUser
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException(error)
      }
      throw error
    }

    return true
  }
}
